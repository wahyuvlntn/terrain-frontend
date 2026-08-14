import { jsPDF } from 'jspdf';

onmessage = async (event) => {
  if (event.data.type === 'generatePDF') {
    const { transferables, options, jobId } = event.data;
    try {
      const doc = new jsPDF(options);

      for (let index = 0; index < transferables.length; index++) {
        const bitmap = transferables[index];
        const imageData = await imageBitmapToString(bitmap);
        if (index > 0) {
          doc.addPage();
        }
        const dataURL = await blobToDataURL(imageData);
        doc.addImage(
          dataURL,
          'JPEG',
          0,
          0,
          options.format[0],
          options.format[1],
          index.toString(),
          'FAST'
        );

        postMessage({ type: 'counter', message: true, jobId });
      }

      const pdfBuffer = doc.output('arraybuffer');
      postMessage({ type: 'complete', pdfBuffer, jobId }, [pdfBuffer]);
    } catch (error) {
      console.log(error);
      postMessage({ type: 'error', error: error.message, jobId });
    }
  }
};

async function imageBitmapToString(imageBitmap) {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(imageBitmap, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });

  return blob
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
