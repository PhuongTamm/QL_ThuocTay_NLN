const { GoogleGenerativeAI } = require("@google/generative-ai");
const chatbotService = require("../services/chatbot.service");
const User = require("../models/User");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Khai báo các công cụ (Hàm) cho Gemini biết nó có thể làm gì
const tools = [
  {
    functionDeclarations: [
      {
        name: "getMedicinePrice",
        description:
          "Lấy thông tin giá bán hiện tại và quy cách đóng gói của một loại thuốc dựa trên tên.",
        parameters: {
          type: "OBJECT",
          properties: {
            medicineName: {
              type: "STRING",
              description: "Tên loại thuốc cần tra cứu giá",
            },
          },
          required: ["medicineName"],
        },
      },
      {
        name: "getInventoryStatus",
        description: "Kiểm tra số lượng tồn kho của một loại thuốc.",
        parameters: {
          type: "OBJECT",
          properties: {
            medicineName: { type: "STRING" },
            branchName: {
              type: "STRING",
              description:
                "Tên chi nhánh cụ thể muốn xem (chỉ dùng nếu người dùng nhắc đến tên chi nhánh)",
            },
          },
          required: ["medicineName"],
        },
      },
      {
        name: "getExpiringMedicines",
        description: "Tìm các lô thuốc trong kho sắp hết hạn sử dụng.",
        parameters: {
          type: "OBJECT",
          properties: {
            days: {
              type: "NUMBER",
              description: "Số ngày sắp hết hạn (mặc định là 90)",
            },
          },
        },
      },
      {
        name: "getMedicineInfo",
        description:
          "Lấy thông tin y khoa chi tiết của thuốc như: Hoạt chất (thành phần), nhà sản xuất, là thuốc kê đơn hay không.",
        parameters: {
          type: "OBJECT",
          properties: {
            medicineName: {
              type: "STRING",
              description: "Tên thuốc cần xem thông tin",
            },
          },
          required: ["medicineName"],
        },
      },
      {
        name: "getTodayRevenue",
        description: "Xem thống kê tổng doanh thu hôm nay.",
        parameters: {
          type: "OBJECT",
          properties: {
            branchName: {
              type: "STRING",
              description: "Tên chi nhánh cần xem doanh thu",
            },
          },
        },
      },
      {
        name: "getTopSellingMedicines",
        description:
          "Lấy danh sách các loại thuốc bán chạy nhất tại chi nhánh.",
        parameters: {
          type: "OBJECT",
          properties: {
            limit: {
              type: "NUMBER",
              description: "Số lượng thuốc muốn xem (mặc định là 5)",
            },
          },
        },
      },
      {
        name: "getLowStockMedicines",
        description:
          "Liệt kê các loại thuốc sắp hết hàng (tồn kho thấp) tại chi nhánh.",
        parameters: {
          type: "OBJECT",
          properties: {
            threshold: {
              type: "NUMBER",
              description: "Mức cảnh báo tồn kho (Ví dụ: dưới 50 viên)",
            },
            branchName: {
              type: "STRING",
              description: "Tên chi nhánh cần xem",
            },
          },
        },
      },
      {
        name: "getMedicinesByCategory",
        description:
          "Tìm danh sách các loại thuốc dựa trên tên danh mục (Ví dụ: Kháng sinh, Giảm đau, Vitamin).",
        parameters: {
          type: "OBJECT",
          properties: {
            categoryName: {
              type: "STRING",
              description: "Tên danh mục cần tìm",
            },
          },
          required: ["categoryName"],
        },
      },
      {
        name: "getCustomerInfo",
        description:
          "Tra cứu thông tin khách hàng, số điểm tích lũy và tổng chi tiêu dựa trên số điện thoại.",
        parameters: {
          type: "OBJECT",
          properties: {
            phone: {
              type: "STRING",
              description: "Số điện thoại của khách hàng",
            },
          },
          required: ["phone"],
        },
      },
      {
        name: "getTransactionDetails",
        description:
          "Tra cứu thông tin chi tiết của một mã hóa đơn hoặc mã phiếu xuất/nhập.",
        parameters: {
          type: "OBJECT",
          properties: {
            transactionCode: {
              type: "STRING",
              description: "Mã hóa đơn/phiếu (Ví dụ: HD1732.., PN123..)",
            },
          },
          required: ["transactionCode"],
        },
      },
      // Thêm vào mảng functionDeclarations trong chatbot.controller.js
      {
        name: "getBatchHistory",
        description:
          "Tra cứu chi tiết lịch sử (nhập, xuất, bán, hủy) của MỘT LÔ THUỐC cụ thể dựa trên tên thuốc và mã lô.",
        parameters: {
          type: "OBJECT",
          properties: {
            medicineName: {
              type: "STRING",
              description: "Tên thuốc cần tra cứu",
            },
            batchCode: {
              type: "STRING",
              description: "Mã lô thuốc (Ví dụ: L123, BATCH01)",
            },
          },
          required: ["medicineName", "batchCode"],
        },
      },
      {
        name: "getRecentTransactions",
        description:
          "Liệt kê các giao dịch gần đây theo LOẠI GIAO DỊCH (nhập kho, xuất kho, bán lẻ, trả hàng, hủy hàng).",
        parameters: {
          type: "OBJECT",
          properties: {
            transactionType: {
              type: "STRING",
              description:
                "BẮT BUỘC trả về 1 trong các giá trị sau: 'IMPORT_SUPPLIER' (Nhập hàng), 'EXPORT_TO_BRANCH' (Phân phối), 'SALE_AT_BRANCH' (Bán lẻ), 'RETURN_TO_WAREHOUSE' (Trả hàng), 'DISPOSAL' (Hủy hàng)",
            },
            limit: {
              type: "NUMBER",
              description: "Số lượng giao dịch muốn xem (mặc định 5)",
            },
            branchName: {
              type: "STRING",
              description: "Tên chi nhánh cần xem",
            },
          },
          required: ["transactionType"],
        },
      },
      // Thêm vào mảng functionDeclarations trong chatbot.controller.js
      {
        name: "getBatchesByMedicine",
        description:
          "Liệt kê danh sách TẤT CẢ các mã lô (batchCode), số lượng tồn, hạn sử dụng và trạng thái chất lượng của một loại thuốc cụ thể đang có trong kho.",
        parameters: {
          type: "OBJECT",
          properties: {
            medicineName: {
              type: "STRING",
              description: "Tên thuốc cần xem danh sách lô",
            },
            branchName: {
              type: "STRING",
              description:
                "Tên chi nhánh cần xem (Tùy chọn, hệ thống sẽ tự động dùng chi nhánh của người hỏi nếu có)",
            },
          },
          required: ["medicineName"],
        },
      },
    ],
  },
];

// Map tên hàm của Gemini với code Node.js thực tế
const functionsMap = {
  getMedicinePrice: chatbotService.getMedicinePrice,
  getInventoryStatus: chatbotService.getInventoryStatus,
  getExpiringMedicines: chatbotService.getExpiringMedicines,
  getMedicineInfo: chatbotService.getMedicineInfo,
  getTodayRevenue: chatbotService.getTodayRevenue,
  getTopSellingMedicines: chatbotService.getTopSellingMedicines,
  getLowStockMedicines: chatbotService.getLowStockMedicines,
  getMedicinesByCategory: chatbotService.getMedicinesByCategory,
  getCustomerInfo: chatbotService.getCustomerInfo,
  getTransactionDetails: chatbotService.getTransactionDetails,
  getBatchHistory: chatbotService.getBatchHistory,
  getRecentTransactions: chatbotService.getRecentTransactions,
  getBatchesByMedicine: chatbotService.getBatchesByMedicine,
};

const roleTitles = {
  admin: "Quản trị viên toàn quyền hệ thống",
  warehouse_manager: "Quản lý Kho Tổng",
  branch_manager: "Quản lý chi nhánh",
  pharmacist: "Dược sĩ",
};

exports.chatWithBot = async (req, res) => {
  try {
    const { message, history } = req.body;
    const branchId = req.user.branchId || null;

    const user = await User.findById(req.user.id);
    const fullName = user ? user.fullName : "bạn";
    const userRoleText = roleTitles[user.role] || "Nhân viên hệ thống";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools,
      systemInstruction: `Bạn là trợ lý AI nội bộ của Hệ thống Quản lý Nhà thuốc. 
      NGƯỜI ĐANG CHAT VỚI BẠN LÀ: "${fullName}"
      CHỨC VỤ CỦA HỌ LÀ: "${userRoleText}"

      QUY TẮC GIAO TIẾP VÀ PHÂN QUYỀN:
      1. Xưng hô phù hợp với chức vụ của họ (Ví dụ: Chào sếp, Chào anh/chị Dược sĩ).
      2. Nếu họ là Admin/Giám đốc, hãy chủ động cung cấp thông tin mang tính tổng quát hệ thống hoặc hỏi họ muốn xem của chi nhánh nào.
      3. Nếu họ là Dược sĩ/Quản lý chi nhánh mà cố tình yêu cầu tra cứu thông tin của "chi nhánh khác" hoặc "toàn hệ thống", hãy từ chối lịch sự và nói rằng hệ thống phân quyền chỉ cho phép họ xem dữ liệu của nhánh mình làm việc.
      4. Tự động đọc lại lịch sử chat để lấy tên thuốc hoặc tên chi nhánh nếu câu hỏi hiện tại bị khuyết thiếu chủ ngữ.
      KỸ NĂNG NGỮ CẢNH (RẤT QUAN TRỌNG):
      - Nếu người dùng đặt câu hỏi thiếu chủ ngữ hoặc tên thuốc (Ví dụ: "Hoạt chất của nó là gì?", "Còn tồn kho bao nhiêu?", "NSX nào?"), bạn BẮT BUỘC PHẢI tự động đọc lại lịch sử trò chuyện trước đó để trích xuất tên thuốc và tự động truyền vào tham số 'medicineName' của các hàm tra cứu.
      - Định dạng tiền tệ luôn là VNĐ (Ví dụ: 150.000đ).
      
      NGUYÊN TẮC AN TOÀN Y TẾ:
      - TUYỆT ĐỐI KHÔNG kê đơn, không đưa ra lời khuyên chẩn đoán bệnh tật. Chỉ cung cấp thông tin có sẵn trong Database hệ thống.
      - Khi người dùng dùng các từ như "thuốc đó", "thuốc này", "nó", BẮT BUỘC phải tìm trong câu trả lời gần nhất của bạn. Nếu câu trả lời gần nhất là chi tiết hóa đơn/phiếu xuất nhập, hãy TỰ ĐỘNG LẤY TÊN THUỐC đầu tiên trong phần "Chi tiết" để gọi hàm.
      - Nếu không tìm thấy tên thuốc nào trong lịch sử, hãy trả lời rằng bạn không thể xác định được loại thuốc nào và yêu cầu họ cung cấp tên thuốc cụ thể.

      
      `,
    });

    const formattedHistory = history
      ? history.map((h) => ({
          role: h.role === "bot" ? "model" : "user",
          parts: [{ text: h.text }],
        }))
      : [];

    const chat = model.startChat({ history: formattedHistory });
    let result = await chat.sendMessage(message);

    // Dùng vòng lặp while để AI có thể tự động gọi bao nhiêu hàm tùy thích
    // cho đến khi nó gom đủ dữ liệu để trả lời text.
    while (
      result.response.functionCalls() &&
      result.response.functionCalls().length > 0
    ) {
      const functionCall = result.response.functionCalls()[0];
      const functionName = functionCall.name;
      const functionArgs = functionCall.args;

      // Thực thi hàm trong Backend
      const apiResponse = await functionsMap[functionName](functionArgs, user);

      // Gửi kết quả lại cho AI và GÁN LẠI result
      result = await chat.sendMessage([
        { functionResponse: { name: functionName, response: apiResponse } },
      ]);
    }

    // Đảm bảo không bị lỗi undefined nếu model gặp trục trặc
    const finalReply =
      result.response.text() ||
      "Xin lỗi sếp, hệ thống không tìm thấy thông tin này.";
    res.status(200).json({ success: true, text: finalReply });
    // let result = await chat.sendMessage(message);
    // let call = result.response.functionCalls();

    // if (call && call.length > 0) {
    //   const functionCall = call[0];
    //   const functionName = functionCall.name;
    //   const functionArgs = functionCall.args;

    //   const apiResponse = await functionsMap[functionName](functionArgs, user);

    //   result = await chat.sendMessage([
    //     { functionResponse: { name: functionName, response: apiResponse } },
    //   ]);
    // }

    // res.status(200).json({ success: true, text: result.response.text() });
  } catch (error) {
    console.error("Lỗi Chatbot:", error);
    res.status(500).json({
      success: false,
      message: "Chatbot đang xử lý quá tải, vui lòng thử lại.",
    });
  }
};
