import { initAll } from "./govuk-frontend.min.js";

initAll();

// A wide table or example scrolls sideways inside its own box. Make a box
// focusable only while it actually scrolls, so that keyboard users can scroll
// it without every table and example becoming an extra stop.
const scrollable = document.querySelectorAll(".app-scroll");

const nameOf = (box) => {
  if (box.matches(".schema-example")) {
    const element = box.textContent.trim().split("\n")[0].replace(/:$/, "");
    return `Example: ${element}`;
  }
  return box.matches(".app-table-wrapper") ? "Table" : "Code";
};

const update = () => {
  for (const box of scrollable) {
    if (box.scrollWidth > box.clientWidth) {
      box.setAttribute("tabindex", "0");
      box.setAttribute("role", "region");
      box.setAttribute("aria-label", `${nameOf(box)} (scrolls sideways)`);
    } else {
      box.removeAttribute("tabindex");
      box.removeAttribute("role");
      box.removeAttribute("aria-label");
    }
  }
};

update();
window.addEventListener("resize", update);
