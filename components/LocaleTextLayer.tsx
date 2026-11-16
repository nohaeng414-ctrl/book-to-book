"use client";

import { useEffect, type ReactNode } from "react";
import { translateText, type AppLanguage } from "@/lib/translations";

const translatedAttributes = ["aria-label", "alt", "placeholder", "title"];
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

export default function LocaleTextLayer({ language, children }: { language: AppLanguage; children: ReactNode }) {
  useEffect(() => {
    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node as Text;
        if (!originalText.has(text)) originalText.set(text, text.data);
        const translated = translateText(originalText.get(text) ?? text.data, language);
        if (text.data !== translated) text.data = translated;
        return;
      }
      if (!(node instanceof Element)) return;
      for (const attribute of translatedAttributes) {
        const value = node.getAttribute(attribute);
        if (value === null) continue;
        let saved = originalAttributes.get(node);
        if (!saved) {
          saved = new Map();
          originalAttributes.set(node, saved);
        }
        if (!saved.has(attribute)) saved.set(attribute, value);
        const translated = translateText(saved.get(attribute) ?? value, language);
        if (value !== translated) node.setAttribute(attribute, translated);
      }
      for (const child of node.childNodes) translateNode(child);
    };

    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target);
        else for (const node of mutation.addedNodes) translateNode(node);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return children;
}
