import { Request, Response } from "express";
import AppError from "../../errorHelpers/AppError";
import { uploadFileToCloudinary } from "../../../config/cloudinary.config";
import { catchAsync } from "../../shared/catchAsync";
import { StatusCodes } from "http-status-codes";

const uploadImage = catchAsync(async (req: Request, res: Response) => {
    if (!req.file?.buffer) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Image file is required");
    }

    const result = await uploadFileToCloudinary(
        req.file.buffer,
        req.file.originalname || `product-${Date.now()}.png`,
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
