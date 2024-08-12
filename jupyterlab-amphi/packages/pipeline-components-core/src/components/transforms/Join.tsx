import { mergeIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class Join extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { how: "left" };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "columns",
          label: "Left Input Column",
          id: "leftKeyColumn",
          placeholder: "Column name",
          tooltip: "If you're joining by multiple columns, make sure the column lists are ordered to match the corresponding columns in the right dataset.",
          inputNb: 1
        },
        {
          type: "columns",
          label: "Right Input Column",
          id: "rightKeyColumn",
          placeholder: "Column name",
          tooltip: "If you're joining by multiple columns, make sure the column lists are ordered to match the corresponding columns in the left dataset.",
          inputNb: 2
        },
        {
          type: "select",
          label: "Join type",
          id: "how",
          placeholder: "Default: Inner",
          options: [
            { value: "inner", label: "Inner: return only the rows with matching keys in both datasets (intersection)." },
            { value: "left", label: "Left: return all rows from the left dataset and matched rows from the right dataset (including NaN for no match)." },
            { value: "right", label: "Right: return all rows from the right dataset and matched rows from the left dataset (including NaN for no match)." },
            { value: "outer", label: "Outer: return all rows from both datasets, with matches where available and NaN for no match (union)." },
            { value: "cross", label: "Outer: creates the cartesian product from both datasets, preserves the order of the left keys." },
            { value: "anti-left", label: "Anti Left: return rows from the left dataset that do not have matching rows in the right dataset." },
            { value: "anti-right", label: "Anti Right: return rows from the right dataset that do not have matching rows in the left dataset." }
          ],
          advanced: true
        }
      ],
    };

    super("Join Datasets", "join", "pandas_df_double_processor", [], "transform", mergeIcon, defaultConfig, form);
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd"];
  }

  public generateComponentCode({ config, inputName1, inputName2, outputName }): string {

    // Extract and map leftKeyColumn and rightKeyColumn arrays
    const leftKeys = config.leftKeyColumn.map(column => column.named ? `"${column.value}"` : column.value);
    const rightKeys = config.rightKeyColumn.map(column => column.named ? `"${column.value}"` : column.value);

    // Join the keys into a string for the Python code
    const leftKeysStr = `[${leftKeys.join(', ')}]`;
    const rightKeysStr = `[${rightKeys.join(', ')}]`;

    let code = `# Join ${inputName1} and ${inputName2}\n`;

    if (config.how === "anti-left") {
      code += `${outputName} = pd.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}, how="left", indicator=True)\n`;
      code += `${outputName} = ${outputName}[${outputName}["_merge"] == "left_only"].drop(columns=["_merge"])\n`;
    } else if (config.how === "anti-right") {
      code += `${outputName} = pd.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}, how="right", indicator=True)\n`;
      code += `${outputName} = ${outputName}[${outputName}["_merge"] == "right_only"].drop(columns=["_merge"])\n`;
    } else {
      const joinType = config.how ? `, how="${config.how}"` : '';
      code += `${outputName} = pd.merge(${inputName1}, ${inputName2}, left_on=${leftKeysStr}, right_on=${rightKeysStr}${joinType})\n`;
    }

    return code;
  }



}