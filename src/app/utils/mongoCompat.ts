/**
 * Maps Prisma `id` (cuid) to Mongo-style `_id` for RetailFlow client compatibility.
 */
type Identifiable = { id: string; [key: string]: unknown };

const serializeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "object" && value !== null) {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
            return (value as { toNumber: () => number }).toNumber();
        }

        if (Array.isArray(value)) {
            return value.map(serializeValue);
        }

        if ("id" in value && typeof (value as Identifiable).id === "string") {
            return toMongoDoc(value as Identifiable);
        }

        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
                key,
                serializeValue(nested),
            ]),
        );
    }

    return value;
};

export const toMongoDoc = <T extends Identifiable>(
    doc: T,
): Record<string, unknown> => {
    const { id, ...rest } = doc;
    const serialized = serializeValue(rest) as Record<string, unknown>;
    return { _id: id, ...serialized };
};

export const toMongoDocs = <T extends Identifiable>(docs: T[]) =>
    docs.map((doc) => toMongoDoc(doc));

export const toMongoDeleteResult = (deletedCount = 1) => ({
    acknowledged: true,
    deletedCount,
});

export const toMongoUpdateResult = (matchedCount = 1, modifiedCount = 1) => ({
    acknowledged: true,
    matchedCount,
    modifiedCount,
    upsertedId: null,
});
