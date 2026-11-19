// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, test } from "vitest";
import { AuthContext, type AuthContextValue } from "../../auth/auth-context";
import { AppLayout } from "./AppLayout";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const auth: AuthContextValue = {
  session: null,
  user: null,
  role: "student",
  loading: false,
  signIn: async () => {},
  changePassword: async () => {},
  signOut: async () => {},
};

let root: Root;
let container: HTMLDivElement;

function element(selector: string): HTMLElement {
  const result = container.querySelector(selector);
  if (!(result instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return result;
}

async function click(selector: string) {
  await act(async () => element(selector).click());
}

beforeEach(async () => {
  container = document.createElement("div");
  document.body.append(container);
  document.body.style.overflow = "auto";
  root = createRoot(container);
  await act(async () => {
    root.render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="dashboard" element={<h1>Dashboard</h1>} />
              <Route path="catalog" element={<h1>Catalog</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.style.overflow = "";
});

test("Menu reveals the mobile sidebar without a conflicting off-screen translation", async () => {
  const menu = element('[aria-label="Open navigation"]');
  const sidebar = element("#app-navigation");
  expect(menu.getAttribute("aria-controls")).toBe(sidebar.id);
  expect(menu.getAttribute("aria-expanded")).toBe("false");
  expect(sidebar.classList.contains("translate-x-full")).toBe(true);

  await click('[aria-label="Open navigation"]');

  expect(menu.getAttribute("aria-expanded")).toBe("true");
  expect(sidebar.classList.contains("translate-x-0")).toBe(true);
  expect(sidebar.classList.contains("translate-x-full")).toBe(false);
  expect(document.activeElement).toBe(element('[aria-label="Close navigation menu"]'));
  expect(document.body.style.overflow).toBe("hidden");
  expect(element('nav a[href="/catalog"]').textContent).toContain("Book catalog");
});

test.each(["Close navigation menu", "Close navigation"])("%s dismisses the sidebar and restores focus and scrolling", async (label) => {
  await click('[aria-label="Open navigation"]');
  await click(`[aria-label="${label}"]`);

  expect(element("#app-navigation").classList.contains("translate-x-full")).toBe(true);
  expect(element("#app-navigation").classList.contains("translate-x-0")).toBe(false);
  expect(element('[aria-label="Open navigation"]').getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(element('[aria-label="Open navigation"]'));
  expect(document.body.style.overflow).toBe("auto");
});

test("Escape dismisses the sidebar and restores focus", async () => {
  await click('[aria-label="Open navigation"]');
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  expect(element('[aria-label="Open navigation"]').getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(element('[aria-label="Open navigation"]'));
  expect(document.body.style.overflow).toBe("auto");
});

test("choosing a destination navigates and dismisses the sidebar", async () => {
  await click('[aria-label="Open navigation"]');
  await click('nav a[href="/catalog"]');
  expect(element("main h1").textContent).toBe("Catalog");
  expect(element('[aria-label="Open navigation"]').getAttribute("aria-expanded")).toBe("false");
  expect(element("#app-navigation").classList.contains("translate-x-full")).toBe(true);
  expect(document.body.style.overflow).toBe("auto");
});
