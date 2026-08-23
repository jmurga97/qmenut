// eslint-disable-next-line unicorn/prefer-node-protocol -- Vite needs the browser `buffer` polyfill, not Node's module.
import { Buffer } from "buffer";

import spaceMonoRegular from "@fontsource/space-mono/files/space-mono-latin-ext-400-normal.woff?url";
import spaceMonoBold from "@fontsource/space-mono/files/space-mono-latin-ext-700-normal.woff?url";
import workSansRegular from "@fontsource/work-sans/files/work-sans-latin-ext-400-normal.woff?url";
import workSansSemibold from "@fontsource/work-sans/files/work-sans-latin-ext-600-normal.woff?url";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { getPrintCopy } from "./print-copy";

import type { PrintableMenuDish, PrintableMenuModel } from "../types";

if (!("Buffer" in globalThis)) {
  Object.defineProperty(globalThis, "Buffer", { configurable: true, value: Buffer });
}

Font.register({
  family: "Printable Work Sans",
  fonts: [
    { fontWeight: 400, src: workSansRegular },
    { fontWeight: 600, src: workSansSemibold },
  ],
});
Font.register({
  family: "Printable Space Mono",
  fonts: [
    { fontWeight: 400, src: spaceMonoRegular },
    { fontWeight: 700, src: spaceMonoBold },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const PAPER = "#FFFFFF";
const INK = "#151515";
const MUTED = "#606060";
const RULE = "#D9D9D2";

function buildInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "QM"
  );
}

function createStyles(accent: string) {
  return StyleSheet.create({
    page: {
      paddingBlock: 38,
      paddingHorizontal: 30,
      backgroundColor: PAPER,
      color: INK,
      fontFamily: "Printable Work Sans",
      fontSize: 8.5,
      lineHeight: 1.35,
    },
    header: {
      position: "absolute",
      top: 13,
      right: 30,
      left: 30,
      height: 17,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderBottomColor: RULE,
      borderBottomWidth: 0.7,
      paddingBottom: 5,
    },
    headerLogo: { width: 15, height: 15, objectFit: "contain" },
    headerInitials: {
      width: 15,
      height: 15,
      backgroundColor: accent,
      color: PAPER,
      fontFamily: "Printable Space Mono",
      fontSize: 5.5,
      lineHeight: 1,
      textAlign: "center",
      paddingTop: 5,
    },
    headerName: { flexGrow: 1, fontFamily: "Printable Space Mono", fontSize: 6.8 },
    headerAccent: { width: 26, height: 2, backgroundColor: accent },
    footer: {
      position: "absolute",
      right: 30,
      bottom: 12,
      left: 30,
      height: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderTopColor: RULE,
      borderTopWidth: 0.7,
      paddingTop: 4,
    },
    footerQr: { width: 18, height: 18 },
    footerCopy: { flexGrow: 1, color: MUTED, fontSize: 5.4, lineHeight: 1.25 },
    intro: { marginBottom: 22, paddingTop: 10 },
    introEyebrow: {
      color: accent,
      fontFamily: "Printable Space Mono",
      fontSize: 6.5,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      marginBottom: 7,
    },
    introTitle: {
      maxWidth: 280,
      fontFamily: "Printable Space Mono",
      fontSize: 20,
      fontWeight: 700,
      lineHeight: 1.05,
      marginBottom: 7,
    },
    introTagline: { maxWidth: 280, color: MUTED, fontSize: 9.2, lineHeight: 1.35 },
    category: { marginBottom: 16 },
    categoryHeader: {
      borderTopColor: accent,
      borderTopWidth: 2,
      paddingTop: 6,
      marginBottom: 8,
    },
    categoryName: {
      fontFamily: "Printable Space Mono",
      fontSize: 12.5,
      fontWeight: 700,
      lineHeight: 1.1,
      marginBottom: 3,
    },
    categoryDescription: { color: MUTED, fontSize: 7.6, lineHeight: 1.35 },
    dish: { paddingBlock: 6.5, borderBottomColor: RULE, borderBottomWidth: 0.6 },
    dishLead: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 2.5 },
    dishNameWrap: { flexGrow: 1, flexBasis: 0 },
    dishName: { fontSize: 9.4, fontWeight: 600, lineHeight: 1.18 },
    dishPriceWrap: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    oldPrice: { color: MUTED, fontSize: 6.4, textDecoration: "line-through" },
    price: { color: accent, fontFamily: "Printable Space Mono", fontSize: 8, fontWeight: 700 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
    badge: {
      borderColor: RULE,
      borderWidth: 0.5,
      paddingVertical: 1.5,
      paddingHorizontal: 4,
      color: MUTED,
      fontFamily: "Printable Space Mono",
      fontSize: 5.3,
    },
    recommendedBadge: { borderColor: accent, color: accent },
    description: { color: MUTED, fontSize: 7.4, lineHeight: 1.35, marginTop: 3 },
    detail: { color: MUTED, fontSize: 6.4, lineHeight: 1.35, marginTop: 3 },
    detailLabel: { color: INK, fontWeight: 600 },
    filler: { flexGrow: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
    fillerMark: {
      width: 58,
      height: 58,
      borderColor: accent,
      borderWidth: 2,
      color: accent,
      fontFamily: "Printable Space Mono",
      fontSize: 16,
      fontWeight: 700,
      paddingTop: 18,
      marginBottom: 14,
    },
    fillerName: { fontFamily: "Printable Space Mono", fontSize: 14, fontWeight: 700, marginBottom: 6 },
    fillerTagline: { maxWidth: 260, color: MUTED, fontSize: 8.5 },
  });
}

function DishDetails({
  dish,
  styles,
  locale,
}: {
  dish: PrintableMenuDish;
  styles: ReturnType<typeof createStyles>;
  locale: string;
}) {
  const copy = getPrintCopy(locale);
  return (
    <View style={styles.dish}>
      <View style={styles.dishLead} minPresenceAhead={18} wrap={false}>
        <View style={styles.dishNameWrap}>
          <Text style={styles.dishName}>{dish.name}</Text>
          {dish.promotion ? <Text style={styles.detail}>{dish.promotion}</Text> : null}
        </View>
        <View style={styles.dishPriceWrap}>
          {dish.oldPrice ? <Text style={styles.oldPrice}>{dish.oldPrice}</Text> : null}
          <Text style={styles.price}>{dish.price}</Text>
        </View>
      </View>
      {dish.recommended || dish.tags.length > 0 ? (
        <View style={styles.badges}>
          {dish.recommended ? <Text style={[styles.badge, styles.recommendedBadge]}>{copy.recommended}</Text> : null}
          {dish.tags.map((tag) => (
            <Text key={tag} style={styles.badge}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
      {dish.description ? (
        <Text orphans={2} style={styles.description} widows={2}>
          {dish.description}
        </Text>
      ) : null}
      {dish.extras.length > 0 ? (
        <Text style={styles.detail}>
          <Text style={styles.detailLabel}>{copy.extras}: </Text>
          {dish.extras.map(({ name, price }) => `${name} ${price}`).join(" · ")}
        </Text>
      ) : null}
      {dish.variants.map((variant) => (
        <Text key={variant.name} style={styles.detail}>
          <Text style={styles.detailLabel}>{variant.name}: </Text>
          {variant.options}
        </Text>
      ))}
      {dish.allergens.length > 0 ? (
        <Text style={styles.detail}>
          <Text style={styles.detailLabel}>{copy.allergens}: </Text>
          {dish.allergens.join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}

function PageChrome({
  menu,
  qrDataUrl,
  repeat = false,
  styles,
}: DocumentProps & { repeat?: boolean; styles: ReturnType<typeof createStyles> }) {
  const copy = getPrintCopy(menu.locale);
  return (
    <>
      <View fixed={repeat} style={styles.header}>
        {menu.logoUrl ? (
          <Image src={menu.logoUrl} style={styles.headerLogo} />
        ) : (
          <Text style={styles.headerInitials}>{buildInitials(menu.branchName)}</Text>
        )}
        <Text style={styles.headerName}>{menu.branchName}</Text>
        <View style={styles.headerAccent} />
      </View>
      <View fixed={repeat} style={styles.footer}>
        <Image src={qrDataUrl} style={styles.footerQr} />
        <Text style={styles.footerCopy}>
          {copy.scan}
          {"\n"}
          {menu.host}
        </Text>
      </View>
    </>
  );
}

interface DocumentProps {
  menu: PrintableMenuModel;
  qrDataUrl: string;
}

export function PrintableMenuDocument({ menu, qrDataUrl }: DocumentProps) {
  const copy = getPrintCopy(menu.locale);
  const styles = createStyles(menu.accent);
  return (
    <Document author="QMenut" subject="Carta plegable A4" title={`${copy.menu} - ${menu.branchName}`}>
      <Page size="A5" style={styles.page} wrap>
        <PageChrome menu={menu} qrDataUrl={qrDataUrl} repeat styles={styles} />
        <View style={styles.intro}>
          <Text style={styles.introEyebrow}>{copy.menu}</Text>
          <Text style={styles.introTitle}>{menu.branchName}</Text>
          {menu.tagline ? <Text style={styles.introTagline}>{menu.tagline}</Text> : null}
        </View>
        {menu.categories.map((category) => (
          <View key={category.id} style={styles.category}>
            <View minPresenceAhead={54} style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.name}</Text>
              {category.description ? <Text style={styles.categoryDescription}>{category.description}</Text> : null}
            </View>
            {category.dishes.map((dish) => (
              <DishDetails dish={dish} key={`${category.id}:${dish.name}`} locale={menu.locale} styles={styles} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function PrintableMenuFillerDocument({ count, menu, qrDataUrl }: DocumentProps & { count: number }) {
  const styles = createStyles(menu.accent);
  return (
    <Document author="QMenut" title={`${menu.branchName} - booklet fillers`}>
      {Array.from({ length: count }, (_, index) => (
        <Page key={index} size="A5" style={styles.page}>
          <PageChrome menu={menu} qrDataUrl={qrDataUrl} styles={styles} />
          <View style={styles.filler}>
            <Text style={styles.fillerMark}>{buildInitials(menu.branchName)}</Text>
            <Text style={styles.fillerName}>{menu.branchName}</Text>
            {menu.tagline ? <Text style={styles.fillerTagline}>{menu.tagline}</Text> : null}
          </View>
        </Page>
      ))}
    </Document>
  );
}
