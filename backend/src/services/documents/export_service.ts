import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  Packer
} from 'docx';
import PDFDocument from 'pdfkit';

export class ExportService {
  /**
   * Generates a professionally styled legal DOCX document.
   * Includes running header, dynamic page footer, and legal heading typography.
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
        spacing: { before: 240, after: 400 }
      })
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }

      if (line.startsWith('# ')) {
        docChildren.push(
          new Paragraph({
            text: line.replace('# ', '').toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 300, after: 200 }
          })
        );
      } else if (line.startsWith('## ')) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace('## ', ''),
                bold: true,
                size: 24 // 12pt
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
          })
        );
      } else if (line.startsWith('### ')) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace('### ', ''),
                bold: true,
                italics: true,
                size: 22 // 11pt
              })
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 100 }
          })
        );
      } else if (line.startsWith('---')) {
        docChildren.push(
          new Paragraph({
            text: '_______________________________________________________________________________',
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 100 }
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22 // 11pt
              })
            ],
            spacing: { after: 140, line: 276 },
            alignment: AlignmentType.JUSTIFIED
          })
        );
      }
    }

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
   * Includes running header, dynamic page footer with page numbers, and legal typography.
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

      // Title
      doc.font('Helvetica-Bold').fontSize(16).text(title.toUpperCase(), {
        align: 'center'
      });
      doc.moveDown(1.5);

      const lines = content.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          doc.moveDown(0.5);
          continue;
        }

        if (line.startsWith('# ')) {
          doc.moveDown(1);
          doc.font('Helvetica-Bold').fontSize(14).text(line.replace('# ', ''), { align: 'center' });
          doc.moveDown(0.5);
        } else if (line.startsWith('## ')) {
          doc.moveDown(0.8);
          doc.font('Helvetica-Bold').fontSize(12).text(line.replace('## ', ''));
          doc.moveDown(0.4);
        } else if (line.startsWith('### ')) {
          doc.moveDown(0.6);
          doc.font('Helvetica-BoldOblique').fontSize(11).text(line.replace('### ', ''));
          doc.moveDown(0.3);
        } else if (line.startsWith('---')) {
          doc.moveDown(0.5);
          doc.strokeColor('#cccccc').lineWidth(1).moveTo(54, doc.y).lineTo(540, doc.y).stroke();
          doc.moveDown(0.5);
        } else {
          doc.font('Helvetica').fontSize(10).text(line, {
            align: 'justify',
            lineGap: 2
          });
          doc.moveDown(0.4);
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
      }

      doc.end();
    });
  }
}

export const exportService = new ExportService();
