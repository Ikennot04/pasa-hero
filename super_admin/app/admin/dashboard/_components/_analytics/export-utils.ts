/**
 * Print only the given report section (hides nav, sidebar, other sections).
 * User can choose "Save as PDF" in the print dialog.
 */
export function printSectionOnly(sectionEl: HTMLElement): void {
  const toHide: Element[] = [
    document.querySelector(".navbar"),
    document.querySelector(".drawer-side"),
    document.querySelector(".analytics-page-header"),
    ...Array.from(document.querySelectorAll(".report-section")).filter(
      (el) => el !== sectionEl
    ),
  ].filter((el): el is Element => el != null);

  toHide.forEach((el) => el.classList.add("no-print"));
  window.print();
  const cleanup = () => {
    toHide.forEach((el) => el.classList.remove("no-print"));
    window.onafterprint = null;
  };
  window.onafterprint = cleanup;
}
