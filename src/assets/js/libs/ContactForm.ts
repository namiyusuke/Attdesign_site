export function initContactForm() {
  const form = document.getElementById("contact-form") as HTMLFormElement;
  if (!form) return;

  const submitButton = document.getElementById("submit-button") as HTMLButtonElement;
  const successMessage = document.getElementById("success-message") as HTMLDivElement;
  const errorMessage = document.getElementById("error-message") as HTMLDivElement;
  const errorText = document.getElementById("error-text") as HTMLSpanElement;
  const errorList = document.getElementById("error-list") as HTMLUListElement;
  const modalCloseButton = document.getElementById("modal-close-button") as HTMLButtonElement;

  // モーダルを閉じる
  function closeModal() {
    successMessage.classList.remove("is-active");
  }

  // 閉じるボタン
  modalCloseButton?.addEventListener("click", closeModal);

  // オーバーレイクリックで閉じる
  successMessage?.addEventListener("click", (e) => {
    if (e.target === successMessage) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    // デフォルトのフォーム送信を防ぐ
    e.preventDefault();

    // メッセージをリセット
    successMessage.classList.remove("is-active");
    errorMessage.classList.add("hidden");

    // ボタンを無効化してローディング表示
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span>送信中...';

    try {
      // フォームデータをJSONに変換
      const formData = new FormData(form);
      const jsonData = Object.fromEntries(formData.entries());

      // APIにPOSTリクエストを送信
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();

      if (result.success) {
        // 成功時：モーダルを表示
        successMessage.classList.add("is-active");
        form.reset();
        submitButton.innerHTML = "送信";
      } else {
        // バリデーションエラー時の処理
        errorText.textContent = "入力内容に問題があります:";
        errorList.innerHTML = result.errors.map((err: string) => `<li>${err}</li>`).join("");
        errorMessage.classList.remove("hidden");
      }
    } catch (error) {
      // ネットワークエラーなどの処理
      errorText.textContent = "送信中にエラーが発生しました。しばらく経ってから再度お試しください。";
      errorList.innerHTML = "";
      errorMessage.classList.remove("hidden");
    } finally {
      // ボタンを元に戻す
      submitButton.disabled = false;
    }
  });
}
