"use client";

import { useEffect } from "react";

function selectedInputsForForm(formId: string) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="ids"][form="${formId}"]:checked, form#${formId} input[name="ids"]:checked`,
    ),
  );
}

function allInputsForForm(formId: string) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="ids"][form="${formId}"], form#${formId} input[name="ids"]`,
    ),
  );
}

export default function BulkSelectionController() {
  useEffect(() => {
    const syncBulkControls = () => {
      document.querySelectorAll<HTMLElement>("[data-bulk-menu]").forEach((menu) => {
        const formId = menu.getAttribute("data-bulk-form") ?? "";
        const selected = formId ? selectedInputsForForm(formId).length : 0;
        menu.classList.toggle("bulk-action-menu-disabled", selected === 0);
        if (selected === 0) menu.removeAttribute("open");
      });

      document.querySelectorAll<HTMLElement>("[data-bulk-direct-actions]").forEach((group) => {
        const formId = group.getAttribute("data-bulk-form") ?? "";
        const selectedInputs = formId ? selectedInputsForForm(formId) : [];
        const selected = selectedInputs.length;
        const firstId = selectedInputs[0]?.value ?? "";
        const returnTo = group.getAttribute("data-return-to") ?? "";
        const edit = group.querySelector<HTMLAnchorElement>("[data-bulk-edit]");
        const copy = group.querySelector<HTMLAnchorElement>("[data-bulk-copy]");
        const del = group.querySelector<HTMLButtonElement>("[data-bulk-delete]");
        const singleEnabled = selected === 1;
        const anyEnabled = selected > 0;

        if (edit) {
          edit.classList.toggle("is-disabled", !singleEnabled);
          edit.setAttribute("aria-disabled", singleEnabled ? "false" : "true");
          edit.href = singleEnabled
            ? `${group.getAttribute("data-edit-base") ?? ""}${firstId}/edit?returnTo=${returnTo}`
            : "#";
        }

        if (copy) {
          copy.classList.toggle("is-disabled", !singleEnabled);
          copy.setAttribute("aria-disabled", singleEnabled ? "false" : "true");
          copy.href = singleEnabled
            ? `${group.getAttribute("data-copy-base") ?? ""}${firstId}&returnTo=${returnTo}`
            : "#";
        }

        if (del) del.disabled = !anyEnabled;
      });

      document.querySelectorAll<HTMLInputElement>(".bulk-select-all").forEach((checkbox) => {
        const formId = checkbox.getAttribute("data-bulk-target") ?? "";
        if (!formId) return;
        const inputs = allInputsForForm(formId);
        const checked = inputs.filter((input) => input.checked).length;
        checkbox.checked = inputs.length > 0 && checked === inputs.length;
        checkbox.indeterminate = checked > 0 && checked < inputs.length;
      });
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.classList.contains("bulk-select-all")) {
        const formId = target.getAttribute("data-bulk-target") ?? "";
        if (formId) {
          allInputsForForm(formId).forEach((input) => {
            input.checked = target.checked;
          });
        }
      }

      if (target.matches('input[name="ids"]') || target.classList.contains("bulk-select-all")) {
        syncBulkControls();
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const disabledLink = target.closest<HTMLAnchorElement>(".bulk-direct-link.is-disabled");
      if (disabledLink) {
        event.preventDefault();
        return;
      }

      document.querySelectorAll<HTMLElement>("[data-bulk-menu][open]").forEach((menu) => {
        if (!menu.contains(target)) menu.removeAttribute("open");
      });
    };

    const onToggle = (event: Event) => {
      const menu = event.target;
      if (!(menu instanceof HTMLElement)) return;
      if (!menu.matches("[data-bulk-menu][open]")) return;

      const formId = menu.getAttribute("data-bulk-form") ?? "";
      const selected = formId ? selectedInputsForForm(formId).length : 0;
      if (selected === 0) menu.removeAttribute("open");
    };

    document.addEventListener("change", onChange);
    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    window.requestAnimationFrame(syncBulkControls);

    return () => {
      document.removeEventListener("change", onChange);
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
