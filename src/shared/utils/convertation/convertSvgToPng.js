import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { sanitizeSvg } from 'scratch-svg-renderer';

let isResvgInitialized = false;

const getSvgViewBoxOffset = (svgText) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return { minX: 0, minY: 0 };

    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const minX = parseFloat(parts[0]);
        const minY = parseFloat(parts[1]);
        return {
          minX: isNaN(minX) ? 0 : minX,
          minY: isNaN(minY) ? 0 : minY
        };
      }
    }
  } catch {}
  return { minX: 0, minY: 0 };
};

const ensureValidSvgDimensions = (svgText, costume) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) return svgText;

    let width = svg.getAttribute('width');
    let height = svg.getAttribute('height');
    let viewBox = svg.getAttribute('viewBox');

    let parsedWidth = parseFloat(width);
    let parsedHeight = parseFloat(height);

    const hasValidWidth = !isNaN(parsedWidth) && parsedWidth > 0 && !width?.includes('%');
    const hasValidHeight = !isNaN(parsedHeight) && parsedHeight > 0 && !height?.includes('%');

    if ((!hasValidWidth || !hasValidHeight) && viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (!isNaN(vbW) && vbW > 0 && !isNaN(vbH) && vbH > 0) {
          if (!hasValidWidth) svg.setAttribute('width', vbW);
          if (!hasValidHeight) svg.setAttribute('height', vbH);
        }
      }
    }

    let finalWidth = parseFloat(svg.getAttribute('width'));
    let finalHeight = parseFloat(svg.getAttribute('height'));

    if ((isNaN(finalWidth) || finalWidth <= 0 || isNaN(finalHeight) || finalHeight <= 0) && costume) {
      if (Array.isArray(costume.size) && costume.size[0] > 0 && costume.size[1] > 0) {
        finalWidth = costume.size[0];
        finalHeight = costume.size[1];
      } else if (costume.rotationCenterX > 0 && costume.rotationCenterY > 0) {
        finalWidth = costume.rotationCenterX * 2;
        finalHeight = costume.rotationCenterY * 2;
      }

      if (!isNaN(finalWidth) && finalWidth > 0 && !isNaN(finalHeight) && finalHeight > 0) {
        svg.setAttribute('width', finalWidth);
        svg.setAttribute('height', finalHeight);
      }
    }

    finalWidth = parseFloat(svg.getAttribute('width'));
    finalHeight = parseFloat(svg.getAttribute('height'));

    if (isNaN(finalWidth) || finalWidth <= 0 || isNaN(finalHeight) || finalHeight <= 0) {
      finalWidth = 480;
      finalHeight = 360;
      svg.setAttribute('width', '480');
      svg.setAttribute('height', '360');
    }

    if (!svg.hasAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${finalWidth} ${finalHeight}`);
    }

    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svgText;
  }
};

const renderSvgViaCanvas = (svgText, resolution) => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = async () => {
      try {
        let imgWidth = img.naturalWidth;
        let imgHeight = img.naturalHeight;

        if (!imgWidth || !imgHeight) {
          const parser = new DOMParser();
          const parsedSvg = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = parsedSvg.querySelector('svg');

          if (svgElement) {
            const wAttr = svgElement.getAttribute('width') || '';
            const hAttr = svgElement.getAttribute('height') || '';

            let attrWidth = wAttr.includes('%') ? NaN : parseFloat(wAttr);
            let attrHeight = hAttr.includes('%') ? NaN : parseFloat(hAttr);

            if ((isNaN(attrWidth) || isNaN(attrHeight)) && svgElement.hasAttribute('viewBox')) {
              const viewBox = svgElement
                .getAttribute('viewBox')
                .trim()
                .split(/[\s,]+/);
              if (viewBox.length === 4) {
                attrWidth = parseFloat(viewBox[2]);
                attrHeight = parseFloat(viewBox[3]);
              }
            }

            if (!isNaN(attrWidth) && !isNaN(attrHeight) && attrWidth > 0 && attrHeight > 0) {
              imgWidth = attrWidth;
              imgHeight = attrHeight;
            }
          }
        }

        if (!imgWidth || !imgHeight) {
          URL.revokeObjectURL(url);
          reject();
          return;
        }

        const width = imgWidth * resolution;
        const height = imgHeight * resolution;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, width, height);

        URL.revokeObjectURL(url);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject();
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve(new Uint8Array(buffer));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
};

export const convertSvgToPng = async (vm, wasmResvgPackage) => {
  if (!vm || !vm.runtime) return;

  if (!isResvgInitialized) {
    await initWasm(wasmResvgPackage);
    isResvgInitialized = true;
  }

  const storage = vm.runtime.storage;
  const targets = vm.runtime.targets;
  let hasChanges = false;

  for (const target of targets) {
    const costumes = target.getCostumes();

    for (let i = 0; i < costumes.length; i++) {
      const costume = costumes[i];

      if (costume.dataFormat === 'svg') {
        hasChanges = true;

        const rawSvgText = costume.asset.decodeText();
        let sanitizedSvgText = sanitizeSvg.sanitizeSvgText(rawSvgText);

        sanitizedSvgText = ensureValidSvgDimensions(sanitizedSvgText, costume);

        const { minX, minY } = getSvgViewBoxOffset(sanitizedSvgText);

        const newBitmapResolution = costume.bitmapResolution === 1 ? 2 : costume.bitmapResolution;

        let pngBuffer = null;
        const hasTextTag = /<text[\s>]/i.test(sanitizedSvgText);

        if (!hasTextTag) {
          const resvg = new Resvg(sanitizedSvgText, {
            fitTo: { mode: 'zoom', value: newBitmapResolution }
          });
          const renderResult = resvg.render();
          pngBuffer = renderResult.asPng();
          renderResult.free();
        } else {
          pngBuffer = await renderSvgViaCanvas(sanitizedSvgText, newBitmapResolution);
        }

        const pngAsset = storage.createAsset(
          storage.AssetType.ImageBitmap,
          storage.DataFormat.PNG,
          pngBuffer,
          null,
          true
        );

        const newMd5ext = `${pngAsset.assetId}.png`;

        costume.asset = pngAsset;
        costume.assetId = pngAsset.assetId;
        costume.dataFormat = 'png';
        costume.md5ext = newMd5ext;
        costume.md5 = newMd5ext;

        const currentCenterX = typeof costume.rotationCenterX === 'number' ? costume.rotationCenterX : 0;
        const currentCenterY = typeof costume.rotationCenterY === 'number' ? costume.rotationCenterY : 0;

        costume.rotationCenterX = (currentCenterX - minX) * newBitmapResolution;
        costume.rotationCenterY = (currentCenterY - minY) * newBitmapResolution;

        costume.bitmapResolution = newBitmapResolution;
      }
    }

    target.updateAllDrawableProperties();
  }

  if (hasChanges) {
    vm.renderer?.draw();
    vm.emitTargetsUpdate();
  }
};
