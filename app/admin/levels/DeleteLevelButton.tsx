"use client";

type DeleteLevelButtonProps = {
  levelId: number;
  levelTitle: string;
};

export default function DeleteLevelButton({
  levelId,
  levelTitle,
}: DeleteLevelButtonProps) {
  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `⚠️ تحذير!\n\n` +
        `هل أنت متأكد من حذف المستوى "${levelTitle}"؟\n\n` +
        `سيتم حذف المستوى وجميع المحتوى المرتبط به مثل:\n` +
        `• الفصول\n` +
        `• المواد التعليمية\n` +
        `• الأسئلة\n` +
        `• إعدادات الاختبار\n\n` +
        `هذا الإجراء لا يمكن التراجع عنه.`
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action="/api/admin/levels"
      method="POST"
      onSubmit={handleDelete}
    >
      <input
        type="hidden"
        name="action"
        value="delete"
      />

      <input
        type="hidden"
        name="id"
        value={levelId}
      />

      <button
        type="submit"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
      >
        🗑️ حذف
      </button>
    </form>
  );
}