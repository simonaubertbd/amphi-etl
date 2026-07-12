import { markdownTTMIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class TableToMarkdown extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      tsCFcolumnsGroupColumns: [],
      tsCFcolumnsMarkdownColumns: [],
      tsCFinputTargetMarkdownColumnName : "markdown_table"
    };

    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Select Group Columns",
          placeholder : "Default : None",
          id: "tsCFcolumnsGroupColumns",
          advanced: true
        },
        {
          type: "columns",
          label: "Select Markdown Columns",
          placeholder : "Default : All",
          id: "tsCFcolumnsMarkdownColumns",
          advanced: true
        },
        {
          type: "input",
          label: "Target Markdown Column Name",
          id: "tsCFinputTargetMarkdownColumnName",
          tooltip: "Target Markdown Column Name",
          advanced: true
        },
      ],
    };

    const description = "Create table in Markdown";

    super("Table To Markdown", "TableToMarkdown", description, "pandas_df_processor", [], "transforms", markdownTTMIcon, defaultConfig, form);
  }

  public provideDependencies({ config }): string[] {
    let deps: string[] = [];
    deps.push('tabulate');
    return deps;
  }
  
  public provideImports({ config }): string[] {
    return [
      "import pandas as pd",
      "from typing import List, Optional",
      "import tabulate"
    ];
  }

  public provideFunctions({ config }): string[] {
    const GroupToMarkdownFunction = `
def py_fn_group_to_markdown(
    py_arg_df: pd.DataFrame,
    py_arg_groupby_cols: Optional[List[str]],
    py_arg_markdown_cols: Optional[List[str]],
    py_arg_markdown_col_name: str = "markdown_table",
    py_arg_round_digits: Optional[int] = None
) -> pd.DataFrame:
    """
    Convert grouped slices of a pandas DataFrame into Markdown tables.

    If grouping columns are provided, returns one row per group with a Markdown
    table (as a string) built from selected columns.

    If no grouping columns are provided, returns a single-row DataFrame with
    one column containing the Markdown representation of the selected columns.

    Parameters
    ----------
    py_arg_df : pd.DataFrame
        Input DataFrame.
    py_arg_groupby_cols : Optional[List[str]]
        Columns used for grouping. If None or empty, no grouping is applied.
    py_arg_markdown_cols : Optional[List[str]]
        Columns to include in the Markdown table. If None or empty, all columns are used.
    py_arg_markdown_col_name : str, default "markdown_table"
        Name of the output column containing Markdown strings.
    py_arg_round_digits : Optional[int], default None
        Number of digits for rounding numeric values inside the Markdown table.

    Returns
    -------
    pd.DataFrame
        A DataFrame containing grouping columns (if any) and a column with
        Markdown table strings (dtype = string).
    """

    if py_arg_df is None:
        raise ValueError("Table To Markdown needs an input dataframe.")

    if not isinstance(py_arg_df, pd.DataFrame):
        raise ValueError("Table To Markdown expects a pandas DataFrame as input.")

    if py_arg_df.empty:
        raise ValueError("Table To Markdown cannot build a markdown table from an empty dataframe.")

    py_var_groupby_cols = list(py_arg_groupby_cols or [])
    py_var_markdown_cols = list(py_arg_markdown_cols or py_arg_df.columns.tolist())

    if len(py_var_markdown_cols) == 0:
        raise ValueError(
            "Table To Markdown could not find any columns to include. "
            "Provide a dataframe with at least one column or select columns explicitly."
        )

    py_var_missing_group_columns = [
        py_var_col for py_var_col in py_var_groupby_cols if py_var_col not in py_arg_df.columns
    ]
    if py_var_missing_group_columns:
        raise ValueError(
            f"Group columns not found in dataframe: {py_var_missing_group_columns}"
        )

    py_var_missing_markdown_columns = [
        py_var_col for py_var_col in py_var_markdown_cols if py_var_col not in py_arg_df.columns
    ]
    if py_var_missing_markdown_columns:
        raise ValueError(
            f"Markdown columns not found in dataframe: {py_var_missing_markdown_columns}"
        )

    def _py_fn_build_markdown(py_arg_sub_df: pd.DataFrame) -> str:
        """
        Internal helper to convert a DataFrame slice to Markdown.
        """
        py_sub = py_arg_sub_df[py_var_markdown_cols].copy()
		
        if py_arg_round_digits is not None:
            py_sub = py_sub.round(py_arg_round_digits)

        return str(py_sub.to_markdown(index=False))

    # Case 1: No grouping
    if not py_var_groupby_cols:
        py_result = pd.DataFrame({
            py_arg_markdown_col_name: [
                _py_fn_build_markdown(py_arg_df)
            ]
        })
        py_result[py_arg_markdown_col_name] = py_result[py_arg_markdown_col_name].astype("string")
        return py_result

    # Case 2: With grouping
    py_result = (
        py_arg_df.groupby(py_var_groupby_cols, dropna=False)
        .agg(**{
            py_arg_markdown_col_name: (
                py_var_markdown_cols[0],
                lambda _: _py_fn_build_markdown(
                    py_arg_df.loc[_.index]
                )
            )
        })
        .reset_index()
    )

    # Enforce string dtype explicitly
    py_result[py_arg_markdown_col_name] = py_result[py_arg_markdown_col_name].astype("string")

    return py_result

    `;
    return [GroupToMarkdownFunction];
  }

  // Generate the Python execution script
  public generateComponentCode({ config, inputName, outputName }: { config: any; inputName: string; outputName: string }): string {

	let tsConstGroupColumns = "None";
    if (config.tsCFcolumnsGroupColumns?.length > 0) {
      tsConstGroupColumns = `[${config.tsCFcolumnsGroupColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }
	let tsConstMarkdownColumns = "None";
    if (config.tsCFcolumnsMarkdownColumns?.length > 0) {
      tsConstMarkdownColumns = `[${config.tsCFcolumnsMarkdownColumns
        .map((item: any) => (item.named ? `"${item.value}"` : item.value))
        .join(", ")}]`;
    }	
	
    let tsConstTargetMarkdownColumnName = 'None';
    if (config.tsCFinputTargetMarkdownColumnName && config.tsCFinputTargetMarkdownColumnName.trim() !== '' 
	) {
      tsConstTargetMarkdownColumnName = '"' + config.tsCFinputTargetMarkdownColumnName+ '"';
    }	

    return `
${outputName} = py_fn_group_to_markdown(
    py_arg_df=${inputName},
    py_arg_groupby_cols=${tsConstGroupColumns},
    py_arg_markdown_cols=${tsConstMarkdownColumns},
    py_arg_markdown_col_name=${tsConstTargetMarkdownColumnName}
)


    `;
  }
}
