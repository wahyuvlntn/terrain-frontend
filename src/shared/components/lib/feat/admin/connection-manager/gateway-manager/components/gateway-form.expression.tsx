import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';

import Editor, { loader } from '@monaco-editor/react';
import { Code as CodeIcon, Open, PlayFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { useContext, useEffect, useState } from 'react';

import { useToggle } from '../../../../../hooks';
import { Button, Input, TextBox } from '../../../../../input';
import { Popup } from '../../../../../navigation';
import { ThemeContext } from '../../../theme-editor';
import { useExecuteExpression } from '../hooks';
// import { AdditionalInfo } from './gateway-form.additional-info';
import style from './gateway-form.module.scss';

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    if (label === 'css') return new CssWorker();
    if (label === 'html') return new HtmlWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco });

// Custom components
const Code = ({
  value,
  onChange,
  onSave,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}) => {
  const {
    colors: { backgroundLow },
  } = useContext(ThemeContext);

  return (
    <Editor
      beforeMount={(monaco) => {
        // Setup custom theme
        monaco.editor.defineTheme('myTheme', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': backgroundLow,
          },
        });

        // Set the compiler options
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
          ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
          target: monaco.languages.typescript.ScriptTarget.ES2017,
          module: monaco.languages.typescript.ModuleKind.ESNext,
          lib: ['es2016'], // only allow es2016 lib
          checkJs: true,
          strict: true,
          allowJs: true,
        });

        // Set the diagnostics options
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
          diagnosticCodesToIgnore: [1108, 1375, 7006, 2322], // 1108 = ignore early return, 1375 = ignore await at the top level, 7006 ignore callback type any, 2322 ignore replace data type
        });
      }}
      theme="myTheme"
      defaultLanguage="javascript"
      value={value}
      onChange={(value) => {
        onChange(value || '');
      }}
      onMount={(editor, monaco) => {
        // Set extra libs
        monaco.languages.typescript.javascriptDefaults.setExtraLibs([
          {
            content: `
                type VTQ = {
                    v: string,
                    t: number,
                    q: number,
                };
                type Output = {[key: string]: string | string[] | VTQ | VTQ[] };
                declare const response: any;
                declare let output: Output;
            `,
            filePath: 'filename/const.d.ts',
          },
        ]);

        // Register command
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          async () => {
            // Format the document
            await editor?.getAction('editor.action.formatDocument')?.run();

            // Call the onSave callback
            onSave && onSave();
          }
        );
      }}
      options={{
        automaticLayout: true,
      }}
      className={style['expanded-expression__code-editor__code']}
    />
  );
};

const ExpressionPopup = ({
  value,
  onChange,
  open,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onClose: () => void;
}) => {
  // Hooks
  const execute = useExecuteExpression();

  // States
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  // Create a local copy of the value
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const onSubmit = () => {
    onChange(localValue);
    onClose();
  };

  return (
    <Popup
      icon={<CodeIcon />}
      title="Expression"
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      afterClose={() => {
        setLocalValue(value);
      }}
      disableSubmit={value === localValue}
      variant="apply"
      background="dark"
    >
      <div className={style['expanded-expression']}>
        <div className={style['expanded-expression__code-editor']}>
          <Code value={localValue} onChange={setLocalValue} onSave={onSubmit} />
        </div>
        <div className={style['expanded-expression__execute']}>
          <TextBox
            label={t('common.example_response_json')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={7}
            wrapperClassName={style['textbox-code']}
            background="dark"
          />
          <Button
            style={{ display: 'flex', justifyContent: 'center' }}
            icon={<PlayFill />}
            type="button"
            disabled={execute.isPending}
            onClick={(e) => {
              e.stopPropagation();

              // Validate the JSON
              try {
                JSON.parse(input);
              } catch (e) {
                setOutput(t('common.response_is_not_a_valid_json'));
                return;
              }

              execute.mutate(
                { expression: localValue, input_response: input },
                {
                  onSuccess: setOutput,
                }
              );
            }}
          >
            Execute
          </Button>
          <TextBox
            label={t('common.result')}
            value={output}
            rows={12}
            readOnly
            wrapperClassName={style['textbox-code']}
            background="dark"
          />
        </div>
      </div>
    </Popup>
  );
};

export const Expression = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [showExpression, toggleShowExpression] = useToggle(false);

  return (
    <div className={style['expression']}>
      <div className={style['expression__content']}>
        <Input
          readOnly
          background='dark'
          title={label}
          value={value}
          inputProps={{
            style: {
              fontFamily: 'monospace'
            }
          }}
          wrapperProps={{
            style: {
              width: '100%'
            }
          }}
        />
        <div className={style['expression__content__expand']}>
          <Open
            height={17}
            width={17}
            onClick={(e) => {
              e.stopPropagation();
              toggleShowExpression();
            }}
          />
        </div>
      </div>
      <ExpressionPopup
        value={value}
        onChange={onChange}
        open={showExpression}
        onClose={toggleShowExpression}
      />
    </div>
  );
};

export const ExpectedOutput = () => {
  return (
    <Input
      readOnly
      background='dark'
      label={t('common.expected_output')}
      value={`{ [address: string]: string | string[] | {v: string, t: number, q: number} | {v: string, t: number, q: number}[] }`}
      inputProps={{
        style: {
          fontFamily: 'monospace'
        }
      }}
    />
  );
};
