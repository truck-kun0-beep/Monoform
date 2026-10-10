// Test stub for `next/server`.
export class NextRequest {}

export class NextResponse {
  static json(body, init) {
    return {
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    };
  }
  static redirect(url, init) {
    return {
      url,
      status: init?.status ?? 307,
      headers: init?.headers ?? {},
    };
  }
  static next() {
    return { headers: {} };
  }
}
