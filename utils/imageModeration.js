const vision = require("@google-cloud/vision");

const UNSAFE_LEVELS = new Set(["LIKELY", "VERY_LIKELY"]);

let client;

function getVisionClient() {
  if (client) {
    return client;
  }

  const options = {};

  if (process.env.GOOGLE_CREDENTIALS) {
    options.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  }

  client = new vision.ImageAnnotatorClient(options);
  return client;
}

async function moderateImageBuffer(buffer) {
  if (!buffer) {
    return {
      isUnsafe: false,
      safeSearch: null
    };
  }

  const visionClient = getVisionClient();

  const [result] = await visionClient.safeSearchDetection({
    image: { content: buffer }
  });

  const safeSearch = result?.safeSearchAnnotation || {};
  const adultLevel = safeSearch.adult || "UNKNOWN";
  const violentLevel = safeSearch.violent || "UNKNOWN";

  return {
    isUnsafe: UNSAFE_LEVELS.has(adultLevel) || UNSAFE_LEVELS.has(violentLevel),
    safeSearch
  };
}

module.exports = {
  moderateImageBuffer
};
