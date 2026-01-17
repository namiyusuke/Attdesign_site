export const getFormattedDate = (isoDate: string, format: 'dot' | 'slash' = 'dot') => {
  const dateObj = new Date(isoDate);

  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();

  // フォーマットに応じて変換
  const separator = format === 'dot' ? '.' : '/';
  const formattedDate = `${year}${separator}${month.toString().padStart(2, '0')}${separator}${day
    .toString()
    .padStart(2, '0')}`;

  return formattedDate;
};
