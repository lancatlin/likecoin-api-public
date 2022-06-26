import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import { API_EXTERNAL_HOSTNAME } from '../../../constant';

let maskData;
async function getImageMask() {
  if (maskData) return maskData;
  const imgPath = path.join(__dirname, '../../../assets/iscn.png');
  maskData = await sharp(imgPath)
    .resize(512, 512)
    .extractChannel('green')
    .toBuffer();
  return maskData;
}

async function getMaskedNFTImage(ogImageUrl) {
  // TODO: use pipe
  const [mask, imageRes] = await Promise.all([
    getImageMask(), axios.get(ogImageUrl, { responseType: 'arraybuffer' }),
  ]);
  const combinedData = await sharp(imageRes.data)
    .ensureAlpha()
    .joinChannel(mask)
    .toBuffer();
  return combinedData;
}

export async function getDynamicNFTImage(classId, classData) {
  // TODO: use real og
  let { ogImageUrl } = classData;
  if (!ogImageUrl) {
    const randomHex = Math.floor(Math.random() * 16777215).toString(16);
    ogImageUrl = `https://singlecolorimage.com/get/${randomHex}/512x512`;
  }
  return getMaskedNFTImage(ogImageUrl);
}

export async function getDynamicBackgroundColor(soldCount) {
  // TODO: replace with actual color map
  if (soldCount > 100) {
    return '#28646e';
  } if (soldCount > 10) {
    return '#16a122';
  } if (soldCount > 1) {
    return '#50e3c2';
  }
  return '#d2f0f0';
}

export async function getLikerNFTDynamicData(classId, classData) {
  const { soldCount } = classData;
  const backgroundColor = await getDynamicBackgroundColor(soldCount);
  return {
    image: `https://${API_EXTERNAL_HOSTNAME}/likernft/metadata/image/class_${classId}.png`,
    backgroundColor,
  };
}
