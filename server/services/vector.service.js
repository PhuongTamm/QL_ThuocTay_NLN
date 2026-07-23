const { QdrantClient } = require("@qdrant/js-client-rest");
const { pipeline } = require("@xenova/transformers");
const crypto = require("crypto");
require("dotenv").config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "luan_van";
let extractor;

const initModel = async () => {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/bge-m3", {
      quantized: true,
    });
  }
  return extractor;
};

// =========================================================
// THUẬT TOÁN CHUNKING (TEXT SPLITTER)
// =========================================================
const splitTextIntoChunks = (text, chunkSize = 500, chunkOverlap = 50) => {
  if (!text) return [];
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Cắt 1 đoạn với độ dài chunkSize
    let endIndex = startIndex + chunkSize;

    // Thuật toán tối ưu: Không cắt ngang giữa 1 từ, lùi lại tìm dấu cách gần nhất
    if (endIndex < text.length && text[endIndex] !== " ") {
      let lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk) chunks.push(chunk);

    // Tính toán điểm bắt đầu của chunk tiếp theo (có tính Overlap)
    startIndex = endIndex - chunkOverlap;

    // Chống vòng lặp vô hạn nếu overlap bị cấu hình sai
    if (startIndex <= 0 || startIndex >= text.length) break;
  }

  return chunks;
};

// Hàm chuyển Text thành Vector
const generateEmbedding = async (text) => {
  const model = await initModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
};

// =========================================================
// HÀM UPSERT ĐÃ NÂNG CẤP (HỖ TRỢ CHUNKING)
// =========================================================
const upsertDocument = async (parentMongoId, payload, textToEmbed) => {
  try {
    // 1. Nếu là Thuốc/Danh mục ngắn -> Cấu hình Chunk to (VD: 1000 ký tự)
    // 2. Nếu là Quy trình dài -> Cấu hình Chunk nhỏ (VD: 400 ký tự)
    const CHUNK_SIZE = payload.type === "knowledge" ? 400 : 1000;
    const CHUNK_OVERLAP = 50;

    // Cắt text thành nhiều đoạn nhỏ
    const chunks = splitTextIntoChunks(textToEmbed, CHUNK_SIZE, CHUNK_OVERLAP);

    // Mảng chứa các point (vector) chuẩn bị đẩy lên Qdrant
    const pointsToUpsert = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const vector = await generateEmbedding(chunkText);

      // Tạo UUID duy nhất cho TỪNG CHUNK bằng cách băm (MongoID + Index)
      const chunkIdRaw = `${parentMongoId}_chunk_${i}`;
      const qdrantChunkId = crypto
        .createHash("md5")
        .update(chunkIdRaw)
        .digest("hex");
      const formattedUUID = `${qdrantChunkId.slice(0, 8)}-${qdrantChunkId.slice(8, 12)}-${qdrantChunkId.slice(12, 16)}-${qdrantChunkId.slice(16, 20)}-${qdrantChunkId.slice(20)}`;

      pointsToUpsert.push({
        id: formattedUUID,
        vector: vector,
        payload: {
          ...payload,
          chunkIndex: i, // Lưu vết nó là đoạn thứ mấy
          totalChunks: chunks.length,
          text: chunkText, // Lưu nội dung chunk để AI đọc
        },
      });
    }

    // Đẩy hàng loạt tất cả các chunk của Document này lên Qdrant
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: pointsToUpsert,
    });

    console.log(
      `✅ Đã đồng bộ ${chunks.length} chunks cho ID: ${parentMongoId}`,
    );
  } catch (error) {
    console.error("❌ Lỗi Upsert Vector:", error);
  }
};

// =========================================================
// HÀM XÓA ĐÃ NÂNG CẤP (Xóa tất cả các chunks của 1 Document)
// =========================================================
const deleteDocument = async (parentMongoId) => {
  try {
    // Qdrant hỗ trợ xóa theo Filter (Xóa tất cả point có chứa mongoId này)
    await qdrant.delete(COLLECTION_NAME, {
      filter: {
        must: [{ key: "mongoId", match: { value: parentMongoId.toString() } }],
      },
    });
    console.log(`🗑️ Đã xóa toàn bộ chunks của MongoID: ${parentMongoId}`);
  } catch (error) {
    console.error("❌ Lỗi xóa Vector:", error);
  }
};

// Hàm tìm kiếm giữ nguyên
const searchSimilar = async (queryText, limit = 5) => {
  const queryVector = await generateEmbedding(queryText);
  return await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: limit,
    with_payload: true,
    score_threshold: 0.5,
  });
};

const initQdrant = async () => {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME,
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 1024, distance: "Cosine" },
      });
      console.log(`✅ Đã tạo Qdrant collection trên Cloud: ${COLLECTION_NAME}`);
    } else {
      console.log(
        `✅ Kết nối Qdrant Cloud thành công! Collection: ${COLLECTION_NAME}`,
      );
    }
  } catch (error) {
    console.error(
      "❌ Lỗi kết nối Qdrant Cloud. Vui lòng kiểm tra lại URL và API Key:",
      error,
    );
  }
};

module.exports = { initQdrant, upsertDocument, deleteDocument, searchSimilar };
