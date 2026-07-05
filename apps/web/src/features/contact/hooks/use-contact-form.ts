import { useEffect, useRef, useState } from "react";

interface ContactFieldEventDetail {
  name: string;
  value: string;
}

interface UseContactFormInput {
  active: boolean;
}

export function useContactForm({ active }: UseContactFormInput) {
  const [messageValue, setMessageValue] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const contactPanelHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const contactPanel = contactPanelHostRef.current?.querySelector("qm-contact-panel");

    if (!contactPanel) {
      return;
    }

    const handleInput = (event: Event) => {
      const { name, value } = (event as CustomEvent<ContactFieldEventDetail>).detail;
      setSubmitted(false);

      if (name === "name") {
        setNameValue(value);
        return;
      }

      if (name === "message") {
        setMessageValue(value);
      }
    };

    const handleSubmit = () => setSubmitted(true);

    contactPanel.addEventListener("qm-input", handleInput);
    contactPanel.addEventListener("qm-submit", handleSubmit);

    return () => {
      contactPanel.removeEventListener("qm-input", handleInput);
      contactPanel.removeEventListener("qm-submit", handleSubmit);
    };
  }, [active]);

  return {
    contactPanelHostRef,
    messageValue,
    nameValue,
    submitted,
  };
}
