import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from 'docx';
import PDFDocument from 'pdfkit';

/**
 * Helper to parse inline markdown (bold **text**, italic *text*) into Word TextRun array.
 */
function parseInlineMarkdownRuns(text: string, defaultSize = 22): TextRun[] {
  const runs: TextRun[] = [];
  // Tokenize by **bold** or *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: defaultSize
        })
      );
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
          size: defaultSize
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          size: defaultSize
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, size: defaultSize }));
  }

  return runs;
}

export class ExportService {
  /**
   * Generates a professionally styled legal DOCX document.
   * Includes running header, dynamic page footer with current/total page,
   * numbered legal headings with keepWithNext to prevent orphaned headings,
   * clean signature tables, and no raw markdown artifacts.
   */
  async generateDocx(title: string, content: string): Promise<Buffer> {
    const lines = content.split('\n');
    const docChildren: any[] = [];

    // Main Title
    docChildren.push(
      new Paragraph({
        text: title.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 360 },
        keepNext: true
      })
    );

    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;

      const numCols = Math.max(...tableRows.map(r => r.length));
      const colWidthPercent = Math.floor(100 / (numCols || 1));

      const rows: TableRow[] = tableRows.map((row, rIdx) => {
        const isHeader = rIdx === 0;
        return new TableRow({
          children: row.map(cellText => {
            const cleanCell = cellText.replace(/^[\s|:]+|[\s|:]+$/g, '').trim();
            return new TableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: parseInlineMarkdownRuns(cleanCell, 20),
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  spacing: { before: 80, after: 80 }
                })
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            });
          })
        });
      });

      docChildren.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      );
      docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Table row detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Skip separator row | :--- | :--- |
        if (/^\|[\s\-:]+\|\s*$/.test(trimmed) || trimmed.includes('---')) {
          continue;
        }
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map(c => c.trim());
        tableRows.push(cells);
        inTable = true;
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (!trimmed) {
        docChildren.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        continue;
      }

      // 1. Level 1 Heading (# Title or major article)
      if (trimmed.startsWith('# ')) {
        const cleanHeading = trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '').trim();
        docChildren.push(
          new Paragraph({
            text: cleanHeading.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 320, after: 180 },
            keepNext: true
          })
        );
      }
      // 2. Level 2 Heading (## Section or Numbered Title e.g. 1. Confidentiality)
      else if (trimmed.startsWith('## ') || /^(?:SECTION|\d+\.)\s+[A-Z]/i.test(trimmed)) {
        const cleanHeading = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '').trim();
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(cleanHeading, 24),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            keepNext: true
          })
        );
      }
      // 3. Level 3 Heading (### Sub-section)
      else if (trimmed.startsWith('### ') || /^\d+\.\d+\s+[A-Za-z]/.test(trimmed)) {
        const cleanHeading = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '').trim();
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(cleanHeading, 22),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 100 },
            keepNext: true
          })
        );
      }
      // 4. Horizontal Rule
      else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
        docChildren.push(
          new Paragraph({
            text: '',
            spacing: { before: 80, after: 140 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' }
            }
          })
        );
      }
      // 5. Bullet Lists
      else if (/^[-*•]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, '');
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(bulletText, 22),
            bullet: { level: 0 },
            spacing: { after: 100, line: 276 },
            alignment: AlignmentType.LEFT
          })
        );
      }
      // 6. Numbered Sub-items ((a), (b), (i), 1.1)
      else if (/^\([a-z0-9]+\)\s+/i.test(trimmed)) {
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(trimmed, 22),
            indent: { left: 720 }, // 0.5 inch indent
            spacing: { after: 120, line: 276 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
      }
      // 7. Signature Block lines (By: ________, Name: ________)
      else if (/^(?:By|Name|Title|Date|Authorized Signatory):\s*_{3,}/i.test(trimmed) || /:\s*_{4,}/.test(trimmed)) {
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(trimmed, 20),
            spacing: { after: 80 },
            keepLines: true
          })
        );
      }
      // 8. Standard Legal Body Paragraph
      else {
        docChildren.push(
          new Paragraph({
            children: parseInlineMarkdownRuns(trimmed, 22),
            spacing: { after: 140, line: 276 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
      }
    }

    if (inTable) {
      flushTable();
    }

    // Disclaimer Paragraph at the bottom
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'LEGAL NOTICE & DISCLAIMER: Atharv Legal AI provides AI-assisted contract drafting and analysis tools. This document does not constitute formal legal representation. Please review with a qualified lawyer in your jurisdiction before executing.',
            italics: true,
            size: 16,
            color: '666666'
          })
        ],
        spacing: { before: 360, after: 120 },
        alignment: AlignmentType.CENTER
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: title.toUpperCase(),
                      size: 16,
                      color: '888888',
                      italics: true
                    })
                  ]
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Atharv Legal AI — Safe Multi-Contract Legal Intelligence  |  Page ',
                      size: 16,
                      color: '888888'
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                      color: '888888'
                    }),
                    new TextRun({
                      text: ' of ',
                      size: 16,
                      color: '888888'
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 16,
                      color: '888888'
                    })
                  ]
                })
              ]
            })
          },
          children: docChildren
        }
      ]
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generates a clean, professionally formatted legal PDF document.
   * Includes running header, dynamic page footer with page numbers ("Page X of Y"),
   * orphan protection for headings and signature blocks, and mandatory disclaimer.
   */
  async generatePdf(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 54, // 0.75 inch
        size: 'A4',
        bufferPages: true
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Main Document Title
      doc.font('Helvetica-Bold').fontSize(16).text(title.toUpperCase(), {
        align: 'center'
      });
      doc.moveDown(1.5);

      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          doc.moveDown(0.4);
          continue;
        }

        // Clean inline markdown bold/italic for text rendering
        const cleanLine = line.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

        // Check for page break orphan protection
        const checkOrphan = (requiredHeight: number) => {
          if (doc.y + requiredHeight > doc.page.height - 72) {
            doc.addPage();
          }
        };

        if (line.startsWith('# ')) {
          checkOrphan(60);
          doc.moveDown(0.8);
          doc.font('Helvetica-Bold').fontSize(13).text(cleanLine.replace(/^#\s+/, '').toUpperCase(), { align: 'center' });
          doc.moveDown(0.4);
        } else if (line.startsWith('## ') || /^(?:SECTION|\d+\.)\s+[A-Z]/i.test(line)) {
          checkOrphan(50);
          doc.moveDown(0.7);
          doc.font('Helvetica-Bold').fontSize(11).text(cleanLine.replace(/^##\s+/, ''));
          doc.moveDown(0.3);
        } else if (line.startsWith('### ') || /^\d+\.\d+\s+[A-Za-z]/.test(line)) {
          checkOrphan(40);
          doc.moveDown(0.5);
          doc.font('Helvetica-BoldOblique').fontSize(10).text(cleanLine.replace(/^###\s+/, ''));
          doc.moveDown(0.25);
        } else if (line.startsWith('---') || line.startsWith('***')) {
          checkOrphan(30);
          doc.moveDown(0.4);
          doc.strokeColor('#cccccc').lineWidth(0.8).moveTo(54, doc.y).lineTo(doc.page.width - 54, doc.y).stroke();
          doc.moveDown(0.4);
        } else if (/^[-*•]\s+/.test(line)) {
          checkOrphan(25);
          doc.font('Helvetica').fontSize(9.5).text(`•  ${cleanLine.replace(/^[-*•]\s+/, '')}`, {
            indent: 12,
            lineGap: 2
          });
          doc.moveDown(0.2);
        } else if (/^(?:By|Name|Title|Date|Authorized Signatory):\s*_{3,}/i.test(line) || /:\s*_{4,}/.test(line)) {
          // Signature block lines: keep together
          checkOrphan(35);
          doc.font('Helvetica').fontSize(9.5).text(cleanLine);
          doc.moveDown(0.2);
        } else {
          checkOrphan(25);
          doc.font('Helvetica').fontSize(9.5).text(cleanLine, {
            align: 'justify',
            lineGap: 2
          });
          doc.moveDown(0.35);
        }
      }

      // Add running headers & footers across all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);

        // Running Header on pages after page 1
        if (i > 0) {
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#888888').text(
            title.toUpperCase(),
            54,
            24,
            { width: doc.page.width - 108, align: 'right' }
          );
        }

        // Running Footer on all pages
        doc.font('Helvetica').fontSize(8).fillColor('#777777').text(
          `Atharv Legal AI — Safe Multi-Contract Legal Intelligence  |  Page ${i + 1} of ${range.count}`,
          54,
          doc.page.height - 36,
          { width: doc.page.width - 108, align: 'center' }
        );

        // On the final page, add the mandatory lawyer review disclaimer
        if (i === range.count - 1) {
          doc.font('Helvetica-Oblique').fontSize(7).fillColor('#999999').text(
            'LEGAL DISCLAIMER: Atharv Legal AI provides AI-assisted contract drafting and analysis tools. This document does not constitute formal legal representation. Please review with a qualified lawyer in your jurisdiction before executing.',
            54,
            doc.page.height - 48,
            { width: doc.page.width - 108, align: 'center' }
          );
        }
      }

      doc.end();
    });
  }
}

export const exportService = new ExportService();
