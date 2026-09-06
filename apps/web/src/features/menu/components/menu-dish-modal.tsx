import { Component, lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { MenuDishModalContent } from "./menu-dish-modal-content";
import type { ComponentProps, ErrorInfo, LazyExoticComponent } from "react";
import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

interface MenuDishModalProps {
  dish: MenuDishViewModel | null;
  onClose: () => void;
  showDishPhoto: boolean;
}

type DishModalComponent = typeof MenuDishModalContent;
type LoadedModalProps = ComponentProps<DishModalComponent>;
const modalModule: { promise?: Promise<{ default: DishModalComponent }> } = {};

async function importDishModal(): Promise<{ default: DishModalComponent }> {
  try {
    const { MenuDishModalContent } = await import("./menu-dish-modal-content");
    return { default: MenuDishModalContent };
  } catch (error) {
    modalModule.promise = undefined;
    throw error;
  }
}

function loadDishModal(): Promise<{ default: DishModalComponent }> {
  modalModule.promise ??= importDishModal();
  return modalModule.promise;
}

/** Starts the modal download on pointer/focus intent, without loading it at page start. */
export function preloadDishModal(): void {
  // A speculative download may fail; opening the modal owns the visible error and retry.
  void loadDishModal().catch(() => {});
}

function ModalStatus({ onClose, onRetry }: { onClose: () => void; onRetry?: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="dish-modal-loading" role={onRetry ? "alert" : "status"}>
      <p>{t(onRetry ? "menu.modalLoadError" : "menu.modalLoading")}</p>
      {onRetry ? (
        <button onClick={onRetry} type="button">
          {t("menu.modalRetry")}
        </button>
      ) : null}
      <button onClick={onClose} type="button">
        {t("menu.closeLabel")}
      </button>
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
  lazyComponent: LazyExoticComponent<DishModalComponent>;
}

class DishModalErrorBoundary extends Component<LoadedModalProps, BoundaryState> {
  state: BoundaryState = { error: null, lazyComponent: lazy(loadDishModal) };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    console.error("No se pudo cargar el detalle del plato", error);
  }

  private readonly handleRetry = () => {
    this.setState({ error: null, lazyComponent: lazy(loadDishModal) });
  };

  render() {
    if (this.state.error) {
      return <ModalStatus onClose={this.props.onClose} onRetry={this.handleRetry} />;
    }

    const LazyDishModal = this.state.lazyComponent;

    return (
      <Suspense fallback={<ModalStatus onClose={this.props.onClose} />}>
        <LazyDishModal {...this.props} />
      </Suspense>
    );
  }
}

export function MenuDishModal(props: MenuDishModalProps) {
  if (!props.dish) {
    return null;
  }

  return <DishModalErrorBoundary key={props.dish.rowKey} {...props} dish={props.dish} />;
}
