export const renameInputValidate = (projectName) =>
  !!projectName?.length && !/<|>|\//g.test(projectName) && projectName?.trim() !== '';
