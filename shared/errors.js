/** 运行时无关的业务异常：带 HTTP 状态码与机器可读 code */
export class ApiError extends Error {
  constructor(status, code, message, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/** 支付宝网关返回的业务错误（code 非 10000） */
export class AlipayError extends Error {
  constructor(code, message, node) {
    super(message)
    this.name = 'AlipayError'
    this.code = code
    this.node = node
  }
}

export const badRequest = (message, detail) => new ApiError(400, 'BAD_REQUEST', message, detail)
export const notFound = (message = '资源不存在') => new ApiError(404, 'NOT_FOUND', message)
export const conflict = (message, code = 'CONFLICT') => new ApiError(409, code, message)
export const unavailable = (message, detail) => new ApiError(503, 'UNAVAILABLE', message, detail)
