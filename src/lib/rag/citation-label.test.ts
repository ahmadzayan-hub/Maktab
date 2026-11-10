import { describe, expect, it } from "vitest";
import { formatCitationLabel } from "./citation-label";

describe("visible citation references", () => {
  it("shows the stored source number instead of a list position", () => {
    expect(formatCitationLabel({ source_number: 3, file_name: "Finance.pdf", page_num: 7 }))
      .toBe("[Source 3] Finance.pdf · p.7");
  });

  it("keeps historical citations readable without inventing missing source numbers", () => {
    expect(formatCitationLabel({ file_name: "Finance.pdf", page_num: 7 })).toBe("Finance.pdf · p.7");
    expect(formatCitationLabel({ file_name: "Notes.txt", page_num: null })).toBe("Notes.txt");
  });

  it.each([0, -1, 1.5, Number.NaN])("does not display an invalid stored source number (%s)", (source_number) => {
    expect(formatCitationLabel({ source_number, file_name: "Notes.txt" })).toBe("Notes.txt");
  });
});
