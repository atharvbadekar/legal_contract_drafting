import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, Packer } from 'docx';
import PDFDocument from 'pdfkit';

export class ExportService {
  /**
   * Generates a professionally styled DOCX document.
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
        spacing: { before: 200, after: 400 }
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
            spacing: { after: 140 },
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
          children: docChildren
        }
      ]
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generates a clean, professionally formatted legal PDF document.
   */
  async generatePdf(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 54, // 0.75 inch
        size: 'A4'
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
        } else if (line.startsWith('---')) {
          doc.moveDown(0.5);
          doc.strokeColor('#cccccc').lineWidth(1).moveTo(54, doc.y).lineTo(540, doc.y).stroke();
          doc.moveDown(0.5);
        } else {
          doc.font('Helvetica').fontSize(10.5).text(line, {
            align: 'justify',
            lineGap: 2
          });
          doc.moveDown(0.4);
        }
      }

      // Legal disclaimer footer
      doc.moveDown(2);
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(
        'Generated via Atharv Legal AI Document Drafting & Validation System. Informational research output — subject to qualified legal review.',
        { align: 'center' }
      );

      doc.end();
    });
  }
}

export const exportService = new ExportService();
