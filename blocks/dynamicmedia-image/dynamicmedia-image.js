import { getDynamicMediaServerURL } from '../../scripts/utils.js';


/**
 * @param {HTMLElement} $block
 */
export default async function decorate(block) {
  console.log(block);
  // this shouldHide logic is temporary till the time DM rendering on published live site is resolved.
  const hostname = window.location.hostname;
  const shouldHide = hostname.includes("aem.live") || hostname.includes("aem.page");

  let deliveryType = Array.from(block.children)[0]?.textContent?.trim();
  let inputs = block.querySelectorAll('.dynamicmedia-image > div');
      
  let inputsArray = Array.from(inputs);
  if(inputsArray.length < 2) {
    console.log("Missing inputs, expecting 2, ensure both the image and DM URL are set in the dialog");
    return;
  }
  let imageEl = inputs[1]?.getElementsByTagName("img")[0];
  let rotate = inputs[2]?.textContent?.trim();
  let flip = inputs[3]?.textContent?.trim();
  let crop = inputs[4]?.textContent?.trim();
  let altText = inputs[5]?.textContent?.trim();

  if(deliveryType != "na"){  
      if(deliveryType === 'dm'){
          // Get DM Url input
          let dmUrlEl = await getDynamicMediaServerURL();
        
          // Ensure S7 is loaded
          if (typeof s7responsiveImage !== 'function') {
            console.error("s7responsiveImage function is not defined, ensure script include is added to head tag");
            return;
          }
        
          // Get image
         
          if(!imageEl) {
            console.error("Image element not found, ensure it is defined in the dialog");
            return;
          }
        
          let imageSrc = imageEl.getAttribute("src");
          if(!imageSrc) {
            console.error("Image element source not found, ensure it is defined in the dialog");
            return;
          }
        
          // Get imageName from imageSrc expected in the format /content/dam/<...>/<imageName>.<extension>
          let imageName = imageSrc.split("/").pop().split(".")[0];
          let dmUrl = dmUrlEl || "https://smartimaging.scene7.com/is/image/DynamicMediaNA/";
                  
          imageEl.setAttribute("data-src", dmUrl + (dmUrl.endsWith('/') ? "" : "/") + imageName);
          imageEl.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
          imageEl.setAttribute("alt", altText ? altText : 'dynamic media image');
          imageEl.setAttribute("data-mode", "smartcrop");
          block.innerHTML = '';
          block.appendChild(imageEl);
          s7responsiveImage(imageEl);
        
          //dmUrlEl.remove();
      }
      if(deliveryType === 'dm-openapi'){
        block.children[7]?.remove();
        block.children[6]?.remove();
        block.children[5]?.remove();
        block.children[4]?.remove();
        block.children[3]?.remove();
        block.children[2]?.remove();  
        block.children[0]?.remove(); 

        // Build OpenAPI delivery URL from authored values and render <img>
        // Prefer authored link; fallback to picture/source/img produced earlier
        const assetLink = inputs[1]?.querySelector('a[href]');
        let baseUrl = assetLink?.href?.split('?')[0];
        if (!baseUrl) {
          const sourceEl = inputs[1]?.querySelector('picture source[srcset]');
          const srcset = sourceEl?.getAttribute('srcset') || '';
          if (srcset) {
            const firstSrc = srcset.split(',')[0].trim();
            baseUrl = firstSrc.split('?')[0];
          }
        }
        if (!baseUrl) {
          const imgEl2 = inputs[1]?.querySelector('picture img[src], img[src]');
          const imgSrc = imgEl2?.getAttribute('src') || '';
          if (imgSrc) {
            baseUrl = imgSrc.split('?')[0];
          }
        }
        const rotationVal = inputs[2]?.textContent?.trim();
        const flipVal = inputs[3]?.textContent?.trim();
        const cropVal = inputs[4]?.textContent?.trim();
        const altFromAuthor = inputs[5]?.textContent?.trim();
        const enableSmartCrop = inputs[6]?.textContent?.trim();
        const breakpointsRaw = inputs[7]?.textContent?.trim();

        if (!baseUrl) {
          console.error("OpenAPI delivery URL not found. Ensure the DM delivery repository asset is selected.");
          return;
        }

        // Shared modifiers (no fixed width, so each smart crop breakpoint keeps its own size)
        const modifierParams = new URLSearchParams();
        modifierParams.set('quality', '85');
        if (rotationVal && rotationVal.toLowerCase() !== 'none') modifierParams.set('rotate', rotationVal);
        if (flipVal) modifierParams.set('flip', flipVal.toLowerCase());
        if (cropVal) modifierParams.set('crop', cropVal.toLowerCase());

        block.innerHTML = '';

        // Images don't expose their Smart Crop names via the metadata endpoint
        // (unlike video), so the author supplies "minWidth:cropName" pairs
        // directly from the asset's Image Processing Profile, e.g.
        // "0:small,700:medium,1300:large".
        const breakpoints = (enableSmartCrop === 'true' && breakpointsRaw)
          ? breakpointsRaw.split(',').map((entry) => {
            const [widthStr, cropName] = entry.split(':').map((part) => part.trim());
            return { minWidth: parseInt(widthStr, 10) || 0, cropName };
          }).filter((bp) => bp.cropName).sort((a, b) => b.minWidth - a.minWidth)
          : [];

        if (breakpoints.length) {
          const pic = document.createElement('picture');

          breakpoints.forEach(({ minWidth, cropName }) => {
            const cropParams = new URLSearchParams(modifierParams);
            cropParams.set('smartcrop', cropName);
            const source = document.createElement('source');
            source.srcset = `${baseUrl}?${cropParams.toString()}`;
            if (minWidth > 0) source.media = `(min-width: ${minWidth}px)`;
            pic.appendChild(source);
          });

          const fallbackParams = new URLSearchParams(modifierParams);
          fallbackParams.set('smartcrop', breakpoints[breakpoints.length - 1].cropName);

          const img = document.createElement('img');
          img.setAttribute('src', `${baseUrl}?${fallbackParams.toString()}`);
          img.setAttribute('alt', altFromAuthor || 'dynamic media image');
          img.setAttribute('loading', 'lazy');
          pic.appendChild(img);

          block.appendChild(pic);
        } else {
          const singleImageParams = new URLSearchParams(modifierParams);
          singleImageParams.set('width', '1400');

          const img = document.createElement('img');
          img.setAttribute('src', `${baseUrl}?${singleImageParams.toString()}`);
          img.setAttribute('alt', altFromAuthor || 'dynamic media image');
          img.setAttribute('loading', 'lazy');

          block.appendChild(img);
        }
      }
      
  } else{
    block.innerHTML = '';
  }
}
