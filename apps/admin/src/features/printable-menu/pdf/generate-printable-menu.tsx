import { pdf } from "@react-pdf/renderer";
import { PageSizes, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

import { mapPrintableMenu } from "./map-printable-menu";
import { PrintableMenuDocument, PrintableMenuFillerDocument } from "./printable-menu-document";

import type { PrintableTheme, PublicMenuData } from "../types";
import type { PDFFont, PDFPage } from "pdf-lib";

interface GeneratePrintableMenuInput {
  host: string;
  locale: string;
  menu: PublicMenuData;
  theme: PrintableTheme | null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(reader.error ?? new Error("No se pudo leer el logotipo.")));
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("El formato del logotipo no es compatible."));
    });
    reader.readAsDataURL(blob);
  });
}

async function loadPrintableLogo(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.type !== "image/jpeg" && blob.type !== "image/png") return null;
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function renderSourcePages(input: GeneratePrintableMenuInput, qrDataUrl: string) {
  const model = mapPrintableMenu(input);
  model.logoUrl = await loadPrintableLogo(model.logoUrl);
  const menuBlob = await pdf(<PrintableMenuDocument menu={model} qrDataUrl={qrDataUrl} />).toBlob();
  const menuDocument = await PDFDocument.load(await menuBlob.arrayBuffer());
  const menuPages = menuDocument.getPages();
  const fillerCount = (4 - (menuPages.length % 4)) % 4;
  if (fillerCount === 0) return { model, sourcePages: menuPages };
  const fillerBlob = await pdf(
    <PrintableMenuFillerDocument count={fillerCount} menu={model} qrDataUrl={qrDataUrl} />,
  ).toBlob();
  const fillerDocument = await PDFDocument.load(await fillerBlob.arrayBuffer());
  return {
    model,
    sourcePages: [...menuPages, ...fillerDocument.getPages()],
  };
}

async function drawPanel({
  font,
  logicalIndex,
  output,
  outputPage,
  sourcePage,
  totalPages,
  x,
}: {
  font: PDFFont;
  logicalIndex: number;
  output: PDFDocument;
  outputPage: PDFPage;
  sourcePage: PDFPage;
  totalPages: number;
  x: number;
}) {
  const embeddedPage = await output.embedPage(sourcePage);
  const [portraitWidth, portraitHeight] = PageSizes.A4;
  const landscapeWidth = portraitHeight;
  outputPage.drawPage(embeddedPage, {
    height: portraitWidth,
    width: landscapeWidth / 2,
    x,
    y: 0,
  });
  const pageLabel = `${logicalIndex + 1}/${totalPages}`;
  const pageLabelSize = 5.6;
  const pageLabelWidth = font.widthOfTextAtSize(pageLabel, pageLabelSize);
  outputPage.drawText(pageLabel, {
    color: rgb(0.38, 0.38, 0.38),
    font,
    size: pageLabelSize,
    x: x + landscapeWidth / 2 - 30 - pageLabelWidth,
    y: 17,
  });
}

interface BookletPanel {
  logicalIndex: number;
  page: PDFPage;
}

async function addImposedSide({
  font,
  left,
  output,
  right,
  totalPages,
}: {
  font: PDFFont;
  left: BookletPanel;
  output: PDFDocument;
  right: BookletPanel;
  totalPages: number;
}) {
  const [portraitWidth, portraitHeight] = PageSizes.A4;
  const page = output.addPage([portraitHeight, portraitWidth]);
  const panelWidth = portraitHeight / 2;
  await Promise.all([
    drawPanel({
      font,
      logicalIndex: left.logicalIndex,
      output,
      outputPage: page,
      sourcePage: left.page,
      totalPages,
      x: 0,
    }),
    drawPanel({
      font,
      logicalIndex: right.logicalIndex,
      output,
      outputPage: page,
      sourcePage: right.page,
      totalPages,
      x: panelWidth,
    }),
  ]);
  const markColor = rgb(0.72, 0.72, 0.69);
  page.drawLine({ start: { x: panelWidth, y: 0 }, end: { x: panelWidth, y: 7 }, color: markColor, thickness: 0.5 });
  page.drawLine({
    start: { x: panelWidth, y: portraitWidth - 7 },
    end: { x: panelWidth, y: portraitWidth },
    color: markColor,
    thickness: 0.5,
  });
}

async function imposeBooklet(sourcePages: PDFPage[], title: string): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  output.setAuthor("QMenut");
  output.setCreator("QMenut Admin");
  output.setProducer("QMenut Admin");
  output.setSubject("Carta plegable A4, impresión a doble cara por el borde corto");
  output.setTitle(title);
  const pageNumberFont = await output.embedFont(StandardFonts.Helvetica);
  const panelCount = sourcePages.length;
  for (let sheet = 0; sheet < panelCount / 4; sheet += 1) {
    const frontLeftIndex = panelCount - 1 - sheet * 2;
    const frontRightIndex = sheet * 2;
    const backLeftIndex = 1 + sheet * 2;
    const backRightIndex = panelCount - 2 - sheet * 2;
    const frontLeft = sourcePages[frontLeftIndex];
    const frontRight = sourcePages[frontRightIndex];
    const backLeft = sourcePages[backLeftIndex];
    const backRight = sourcePages[backRightIndex];
    if (!frontLeft || !frontRight || !backLeft || !backRight) {
      throw new Error("No se pudo ordenar la carta para el plegado.");
    }
    await addImposedSide({
      font: pageNumberFont,
      left: { logicalIndex: frontLeftIndex, page: frontLeft },
      output,
      right: { logicalIndex: frontRightIndex, page: frontRight },
      totalPages: panelCount,
    });
    await addImposedSide({
      font: pageNumberFont,
      left: { logicalIndex: backLeftIndex, page: backLeft },
      output,
      right: { logicalIndex: backRightIndex, page: backRight },
      totalPages: panelCount,
    });
  }
  return output.save();
}

export async function generatePrintableMenuPdf(input: GeneratePrintableMenuInput): Promise<Blob> {
  const menuUrl = `https://${input.host}`;
  const qrDataUrl = await QRCode.toDataURL(menuUrl, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 180,
  });
  const { model, sourcePages } = await renderSourcePages(input, qrDataUrl);
  const bytes = await imposeBooklet(sourcePages, `${model.branchName} - ${model.locale}`);
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
