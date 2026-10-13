"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
function getPagination(req, defaultLimit = 10) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit, take: limit };
}
