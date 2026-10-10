// Test stub for `next/headers`.
export function cookies() {
  return {
    get(name) {
      return { name, value: "" };
    },
    getAll() {
      return [];
    },
    set() {},
    delete() {},
  };
}

export function headers() {
  return new Headers();
}
