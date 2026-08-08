/**
 * Links out to the official dMAT sources.
 *
 * Only links live here — no official material is bundled with this project.
 * Add a new entry to the relevant group and it appears on /resources.
 */

export interface ResourceLink {
  title: string;
  description: string;
  href: string;
  /** Shown as a small tag on the button. */
  kind: "PDF" | "Page";
}

export interface ResourceGroup {
  heading: string;
  blurb: string;
  links: ResourceLink[];
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    heading: "Preparatory materials",
    blurb:
      "The official PDFs, served straight from d-mat.de. These are the authoritative description of each module.",
    links: [
      {
        title: "General Academic Module",
        description:
          "Covers the Core Module — Figure Sequences, Mathematical Equations and Latin Squares — plus the general academic subject module. This is the one this trainer is built around.",
        href: "https://www.d-mat.de/wp-content/uploads/2026/08/260804_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf",
        kind: "PDF",
      },
      {
        title: "Data Science module",
        description:
          "Subject module preparatory materials for Data Science, published July 2026.",
        href: "https://www.d-mat.de/wp-content/uploads/2026/07/260713_dMAT_Data-Science_Preparatoy-Materials_EN.pdf",
        kind: "PDF",
      },
      {
        title: "Battery Science module",
        description:
          "Subject module preparatory materials for Battery Science, published February 2025.",
        href: "https://www.d-mat.de/wp-content/uploads/2025/02/Feb2025_dMAT_BatterySc_Preparatoy-Materials_EN.pdf",
        kind: "PDF",
      },
    ],
  },
  {
    heading: "Test centre and booking",
    blurb: "Where to sit the exam and how to register.",
    links: [
      {
        title: "g.a.s.t. centre search — dMAT",
        description:
          "Test centre details and available dates on the g.a.s.t. portal.",
        href: "https://www.gast.de/portal/center-search/center-search/dmat/details/10020?subject-module=7",
        kind: "Page",
      },
    ],
  },
];
