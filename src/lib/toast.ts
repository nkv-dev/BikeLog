export function showToast(message: string, type: "success" | "error" | "info" = "success"): void {
  const colors = {
    success: "border-green-500/40 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200",
    error: "border-red-500/40 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200",
    info: "border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  };

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.className =
      "fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 ${colors[type]}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export function confirmDialog(message: string, onConfirm: () => void): void {
  let modal = document.getElementById("confirm-modal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "confirm-modal";
    modal.className =
      "m-auto rounded-2xl border border-border bg-background p-6 shadow-xl backdrop:bg-black/50";
    modal.innerHTML = `
      <h3 class="mb-2 text-lg font-bold" id="confirm-modal-title">Are you sure?</h3>
      <p class="mb-6 text-sm text-muted-foreground" id="confirm-modal-msg"></p>
      <div class="flex gap-3">
        <button id="confirm-cancel" class="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted" autofocus>Cancel</button>
        <button id="confirm-ok" class="flex-1 rounded-lg bg-destructive px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-destructive/90">Delete</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#confirm-cancel")!.addEventListener("click", () => modal!.close());
    modal.querySelector("#confirm-ok")!.addEventListener("click", () => {
      onConfirm();
      modal!.close();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal!.close();
    });
  }

  modal.querySelector("#confirm-modal-msg")!.textContent = message;
  const okBtn = modal.querySelector("#confirm-ok") as HTMLButtonElement;
  okBtn.textContent = "Delete";

  if (typeof (modal as any).showModal === "function") {
    (modal as any).showModal();
  } else {
    modal.setAttribute("open", "");
  }
}
