import { Request, Response } from "express";
import AppError from "../../errorHelpers/AppError";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";
import { catchAsync } from "../../shared/catchAsync";
import { StatusCodes } from "http-status-codes";

const uploadImage = catchAsync(async (req: Request, res: Response) => {
    const file = req.file;

    if (!file?.buffer?.length) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            file
                ? "Uploaded image file is empty"
                : "Image file is required. Send multipart field name \"image\".",
        );
    }

    const result = await uploadFileToCloudinary(
        file.buffer,
        file.originalname || `product-${Date.now()}.png`,
        "RetailFlow",
    );

    res.send({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
    });
});

export const UploadController = {
    uploadImage,
};
