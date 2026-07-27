import { Form } from "react-router";

interface InstallFormProps {
  showForm: boolean;
  inputId?: string;
}

export function InstallForm({
  showForm,
  inputId = "shop",
}: InstallFormProps) {
  if (!showForm) {
    return (
      <p className="mt-4 text-sm text-white/70">
        Run <code className="rounded bg-white/10 px-1.5 py-0.5">npm run dev</code>{" "}
        with Shopify CLI to enable install.
      </p>
    );
  }

  return (
    <Form
      className="mx-auto mt-6 w-full max-w-md text-left"
      method="post"
      action="/auth/login"
    >
      <label className="mb-1.5 block text-sm font-medium text-white/80" htmlFor={inputId}>
        Shop domain
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/50"
          id={inputId}
          type="text"
          name="shop"
          placeholder="my-shop.myshopify.com"
          autoComplete="off"
          required
        />
        <button
          className="h-11 shrink-0 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
          type="submit"
        >
          Install on Shopify
        </button>
      </div>
    </Form>
  );
}
