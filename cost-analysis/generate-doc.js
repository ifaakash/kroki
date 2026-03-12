const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak,
} = require("docx");

// ── Color palette ──
const DARK_BLUE = "1F3864";
const MED_BLUE = "2E75B6";
const LIGHT_BLUE = "D6E4F0";
const LIGHTER_BLUE = "EDF2F9";
const WHITE = "FFFFFF";
const DARK_GRAY = "333333";
const GREEN = "548235";

// ── Table helpers ──
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "B4C6E7" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const TABLE_WIDTH = 9360; // US Letter with 1" margins

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })],
    })],
  });
}

function dataCell(text, width, shaded = false, bold = false, color = DARK_GRAY) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shaded ? LIGHTER_BLUE : WHITE, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, bold, color, font: "Arial", size: 20 })],
    })],
  });
}

function costCell(text, width, shaded = false, bold = false, color = DARK_GRAY) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shaded ? LIGHTER_BLUE : WHITE, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text, bold, color, font: "Arial", size: 20 })],
    })],
  });
}

function totalRow(label, amount, color = DARK_BLUE) {
  return new TableRow({
    children: [
      new TableCell({
        borders, columnSpan: 2,
        width: { size: 7360, type: WidthType.DXA },
        shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: label, bold: true, color, font: "Arial", size: 20 })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: 2000, type: WidthType.DXA },
        shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: amount, bold: true, color, font: "Arial", size: 20 })],
        })],
      }),
    ],
  });
}

function buildCostTable(devData, prodData, devTotal, prodTotal, grandTotal) {
  const COL1 = 2360;
  const COL2 = 5000;
  const COL3 = 2000;
  const rows = [];

  // Header row
  rows.push(new TableRow({
    children: [
      headerCell("Environment / Region", COL1),
      headerCell("AWS Service", COL2),
      headerCell("Cost (USD)", COL3),
    ],
  }));

  // Dev section header
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders, columnSpan: 3,
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        shading: { fill: MED_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          children: [new TextRun({ text: "DEV Environment (us-east-1)", bold: true, color: WHITE, font: "Arial", size: 20 })],
        })],
      }),
    ],
  }));

  // Dev data rows
  devData.forEach((row, i) => {
    const shaded = i % 2 === 0;
    rows.push(new TableRow({
      children: [
        dataCell("Dev (us-east-1)", COL1, shaded),
        dataCell(row.service, COL2, shaded),
        costCell(row.cost, COL3, shaded),
      ],
    }));
  });

  // Dev total
  rows.push(totalRow("Total Dev (us-east-1)", devTotal));

  // Prod section header
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders, columnSpan: 3,
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        shading: { fill: MED_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          children: [new TextRun({ text: "PROD Environment (us-east-2)", bold: true, color: WHITE, font: "Arial", size: 20 })],
        })],
      }),
    ],
  }));

  // Prod data rows
  prodData.forEach((row, i) => {
    const shaded = i % 2 === 0;
    rows.push(new TableRow({
      children: [
        dataCell("Prod (us-east-2)", COL1, shaded),
        dataCell(row.service, COL2, shaded),
        costCell(row.cost, COL3, shaded),
      ],
    }));
  });

  // Prod total
  rows.push(totalRow("Total Prod (us-east-2)", prodTotal));

  // Grand total
  rows.push(new TableRow({
    children: [
      new TableCell({
        borders, columnSpan: 2,
        width: { size: 7360, type: WidthType.DXA },
        shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Grand Total", bold: true, color: WHITE, font: "Arial", size: 22 })],
        })],
      }),
      new TableCell({
        borders,
        width: { size: 2000, type: WidthType.DXA },
        shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: grandTotal, bold: true, color: WHITE, font: "Arial", size: 22 })],
        })],
      }),
    ],
  }));

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [COL1, COL2, COL3],
    rows,
  });
}

// ── Key info box ──
function keyInfoTable(accountId, period, devTotal, prodTotal, grandTotal) {
  const COL_L = 4680;
  const COL_R = 4680;
  const infoBorder = { style: BorderStyle.SINGLE, size: 1, color: MED_BLUE };
  const infoBorders = { top: infoBorder, bottom: infoBorder, left: infoBorder, right: infoBorder };

  function infoRow(label, value, shade = false) {
    return new TableRow({
      children: [
        new TableCell({
          borders: infoBorders,
          width: { size: COL_L, type: WidthType.DXA },
          shading: { fill: shade ? LIGHTER_BLUE : WHITE, type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, color: DARK_BLUE, font: "Arial", size: 22 })],
          })],
        }),
        new TableCell({
          borders: infoBorders,
          width: { size: COL_R, type: WidthType.DXA },
          shading: { fill: shade ? LIGHTER_BLUE : WHITE, type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({
            children: [new TextRun({ text: value, font: "Arial", size: 22, color: DARK_GRAY })],
          })],
        }),
      ],
    });
  }

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [COL_L, COL_R],
    rows: [
      // header
      new TableRow({
        children: [
          new TableCell({
            borders: infoBorders, columnSpan: 2,
            width: { size: TABLE_WIDTH, type: WidthType.DXA },
            shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({
              children: [new TextRun({ text: "Summary", bold: true, color: WHITE, font: "Arial", size: 24 })],
            })],
          }),
        ],
      }),
      infoRow("AWS Management Account ID", accountId, true),
      infoRow("Billing Period", period),
      infoRow("Dev (us-east-1) Estimated Spend", devTotal, true),
      infoRow("Prod (us-east-2) Estimated Spend", prodTotal),
      infoRow("Total Estimated Monthly Spend", grandTotal, true),
    ],
  });
}

// ── Data ──
const currentMonthDev = [
  { service: "AWS Secrets Manager", cost: "$4.13" },
  { service: "Amazon EC2 Container Registry (ECR)", cost: "$0.37" },
  { service: "EC2 - Other", cost: "$14.72" },
  { service: "Amazon Elastic Compute Cloud - Compute", cost: "$23.72" },
  { service: "Amazon Elastic Load Balancing", cost: "$5.88" },
  { service: "Amazon Relational Database Service", cost: "$44.48" },
  { service: "Amazon Simple Storage Service", cost: "$0.16" },
  { service: "Amazon Virtual Private Cloud", cost: "$5.67" },
  { service: "AmazonCloudWatch", cost: "$11.68" },
];
const currentMonthProd = [
  { service: "AWS Secrets Manager", cost: "$4.13" },
  { service: "Amazon EC2 Container Registry (ECR)", cost: "$0.17" },
  { service: "EC2 - Other", cost: "$27.00" },
  { service: "Amazon Elastic Compute Cloud - Compute", cost: "$103.00" },
  { service: "Amazon Elastic Load Balancing", cost: "$6.01" },
  { service: "Amazon Relational Database Service", cost: "$96.70" },
  { service: "Amazon Simple Storage Service", cost: "$0.02" },
  { service: "Amazon Virtual Private Cloud", cost: "$9.23" },
  { service: "AmazonCloudWatch", cost: "$13.27" },
];

const prevMonthDev = [
  { service: "AWS Secrets Manager", cost: "$6.61" },
  { service: "Amazon EC2 Container Registry (ECR)", cost: "$0.46" },
  { service: "EC2 - Other", cost: "$38.31" },
  { service: "Amazon Elastic Compute Cloud - Compute", cost: "$48.25" },
  { service: "Amazon Elastic Load Balancing", cost: "$15.07" },
  { service: "Amazon Relational Database Service", cost: "$114.55" },
  { service: "Amazon Simple Storage Service", cost: "$0.45" },
  { service: "Amazon Virtual Private Cloud", cost: "$10.96" },
  { service: "AmazonCloudWatch", cost: "$13.66" },
];
const prevMonthProd = [
  { service: "AWS Secrets Manager", cost: "$3.44" },
  { service: "Amazon EC2 Container Registry (ECR)", cost: "$0.07" },
  { service: "EC2 - Other", cost: "$53.71" },
  { service: "Amazon Elastic Compute Cloud - Compute", cost: "$105.95" },
  { service: "Amazon Elastic Load Balancing", cost: "$6.92" },
  { service: "Amazon Relational Database Service", cost: "$144.03" },
  { service: "Amazon Simple Storage Service", cost: "$0.02" },
  { service: "Amazon Virtual Private Cloud", cost: "$15.71" },
  { service: "AmazonCloudWatch", cost: "$11.22" },
];

// ── Build document ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK_BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: MED_BLUE },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MED_BLUE, space: 1 } },
              children: [
                new TextRun({ text: "AWS Cost Analysis Report", bold: true, color: DARK_BLUE, font: "Arial", size: 18 }),
                new TextRun({ text: "\tOptic Cost Management", color: "999999", font: "Arial", size: 16 }),
              ],
              tabStops: [{ type: "right", position: 9360 }],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", color: "999999", font: "Arial", size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], color: "999999", font: "Arial", size: 16 }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ── Title ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "AWS Cost Analysis Report", bold: true, color: DARK_BLUE, font: "Arial", size: 48 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Optic Platform - Dev & Prod Environments", color: MED_BLUE, font: "Arial", size: 24 })],
        }),

        // ── Section 1: Current Month ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Current Month (March 2026 - Partial)")] }),

        // Summary box
        keyInfoTable("858409149719", "March 1, 2026 - March 12, 2026", "$110.80", "$259.53", "$370.33"),

        new Paragraph({ spacing: { before: 300 } }),

        // Heading for detailed breakdown
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Detailed Cost Breakdown by Service")] }),

        // Cost table
        buildCostTable(currentMonthDev, currentMonthProd, "$110.80", "$259.53", "$370.33"),

        // ── Page break ──
        new Paragraph({ children: [new PageBreak()] }),

        // ── Section 2: Previous Month ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Previous Month (February 2026)")] }),

        // Summary box
        keyInfoTable("858409149719", "February 1, 2026 - March 1, 2026", "$248.31", "$341.06", "$589.37"),

        new Paragraph({ spacing: { before: 300 } }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Detailed Cost Breakdown by Service")] }),

        // Cost table
        buildCostTable(prevMonthDev, prevMonthProd, "$248.31", "$341.06", "$589.37"),
      ],
    },
  ],
});

// ── Generate ──
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("/Users/aakashchoudhary/PlantUML/kroki/cost-analysis/cost-analysis-optic.docx", buffer);
  console.log("Document generated successfully.");
});
