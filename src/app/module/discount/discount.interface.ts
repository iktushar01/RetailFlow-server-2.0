export interface IDiscountPayload {
    offerName: string;
    code?: string;
    type: string;
    value: number;
    validFrom: string | Date;
    validTo: string | Date;
    status?: string;
    applicableProducts?: string[];
    applicableCategories?: string[];
}

export interface IDiscountUpdatePayload extends Partial<IDiscountPayload> {}
