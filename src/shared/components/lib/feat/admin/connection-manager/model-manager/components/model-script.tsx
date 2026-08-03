import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';

import Editor, { loader } from '@monaco-editor/react';
import { InformationCircle } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ToggleSwitch } from '@digital-twin/reusables';
import clsx from 'clsx';
import * as monacoConfig from 'monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { forwardRef, useContext, useImperativeHandle, useRef } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '../../../../../others';
import { ThemeContext } from '../../../theme-editor';
import style from './model-details.module.scss';

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    if (label === 'css') return new CssWorker();
    if (label === 'html') return new HtmlWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco: monacoConfig });

// Types
export interface ModelScriptHandler {
  appendText: (text: string) => void;
}

interface ModelScriptProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onSave?: () => void;
  height?: string | number;
  tsDeclaration?: string;
  readOnly?: boolean;
  isOverride?: boolean;
  onChangeOverride?: (value: boolean) => void;
  type?: 'boolean' | 'dynamic_alarm';
}

export const ModelScript = forwardRef<ModelScriptHandler, ModelScriptProps>(
  (
    {
      label,
      value,
      onChange,
      onSave,
      height,
      tsDeclaration,
      readOnly,
      isOverride,
      onChangeOverride,
      type = 'boolean',
    }: ModelScriptProps,
    ref
  ) => {
    const {
      colors: { backgroundLowest },
    } = useContext(ThemeContext);

    const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);

    // expose the appendText function to parent component
    useImperativeHandle(
      ref,
      () => ({
        appendText: (text: string) => {
          if (!editorRef.current) {
            return;
          }

          const selection = editorRef.current.getSelection();

          if (!selection) {
            return;
          }

          const range = new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          );

          editorRef.current.executeEdits('', [
            {
              range,
              text,
              forceMoveMarkers: true,
            },
          ]);
        },
      }),
      []
    );

    return (
      <div className={style['model-script']}>
        <div className={style['model-script__header']}>
          <span className={style['model-script__header__label']}>{label}</span>
          {onChangeOverride !== undefined ? (
            <ToggleOverride value={!!isOverride} onChange={onChangeOverride} />
          ) : null}
          <div className={style['info__header']}>
            <span className={style['model-script__header__label']}>
              {t('common.expected_output')}
            </span>
            <Popover offset={0} placement="bottom-start">
              <PopoverTrigger>
                <InformationCircle className={style['info__icon']} />
              </PopoverTrigger>
              <PopoverContent className={style['info']}>
                <span className={style['info__message']}>
                  {t('common.return_value_script')}
                </span>
                {type === 'boolean' ? (
                  <div className={style['info__schema-row']}>
                    <span className={style['info__title']}>
                      {t('common.schema')}:
                    </span>
                    <span className={style['info__schema']}>
                      {t('common.boolean')}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className={style['info__title']}>
                      {t('common.schema')}:
                    </span>
                    <span className={style['info__schema']}>
                      {`{
  name: string;
  criticality: "WARNING" | "CRITICAL";
  message: string;
} | false`}
                    </span>
                  </>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div
          className={clsx(
            style['model-script__value'],
            readOnly && style['model-script__value--read-only']
          )}
          style={{ height }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            {readOnly ? (
              <Editor
                className={style['model-script__editor']}
                key={0}
                beforeMount={(monaco) => {
                  // Setup custom theme
                  monaco.editor.defineTheme('readOnlyTheme', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': backgroundLowest,
                    },
                  });

                  // Set the compiler options
                  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
                    {
                      ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
                      target: monaco.languages.typescript.ScriptTarget.ES2017,
                      module: monaco.languages.typescript.ModuleKind.ESNext,
                      lib: ['es2016'], // only allow es2016 lib
                      checkJs: true,
                      strict: true,
                      allowJs: true,
                    }
                  );

                  // Set the diagnostics options
                  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
                    {
                      noSemanticValidation: false,
                      noSyntaxValidation: false,
                      diagnosticCodesToIgnore: [1108, 1375, 7006, 2322], // 1108 = ignore early return, 1375 = ignore await at the top level, 7006 ignore callback type any, 2322 ignore replace data type
                    }
                  );
                }}
                theme="readOnlyTheme"
                defaultLanguage="javascript"
                value={value || ''}
                onMount={(editor, monaco) => {
                  // Set extra libs (if any)
                  if (tsDeclaration) {
                    monaco.languages.typescript.javascriptDefaults.setExtraLibs(
                      [
                        {
                          content: tsDeclaration,
                          filePath: 'filename/const.d.ts',
                        },
                      ]
                    );
                  }

                  editorRef.current = editor;
                }}
                options={{
                  automaticLayout: true,
                  readOnly: true,
                }}
              />
            ) : (
              <Editor
                className={style['model-script__editor']}
                key={1}
                beforeMount={(monaco) => {
                  // Setup custom theme
                  monaco.editor.defineTheme('editableTheme', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': backgroundLowest,
                    },
                  });

                  // Set the compiler options
                  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
                    {
                      ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
                      target: monaco.languages.typescript.ScriptTarget.ES2017,
                      module: monaco.languages.typescript.ModuleKind.ESNext,
                      lib: ['es2016'], // only allow es2016 lib
                      checkJs: true,
                      strict: true,
                      allowJs: true,
                    }
                  );

                  // Set the diagnostics options
                  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
                    {
                      noSemanticValidation: false,
                      noSyntaxValidation: false,
                      diagnosticCodesToIgnore: [1108, 1375, 7006, 2322], // 1108 = ignore early return, 1375 = ignore await at the top level, 7006 ignore callback type any, 2322 ignore replace data type
                    }
                  );
                }}
                theme="editableTheme"
                defaultLanguage="javascript"
                value={value || ''}
                onChange={(value) => {
                  onChange(value || null);
                }}
                onMount={(editor, monaco) => {
                  // Set extra libs (if any)
                  if (tsDeclaration) {
                    monaco.languages.typescript.javascriptDefaults.setExtraLibs(
                      [
                        {
                          content: tsDeclaration,
                          filePath: 'filename/const.d.ts',
                        },
                      ]
                    );
                  }

                  // Register command
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                    async () => {
                      // Format the document
                      const action = editor?.getAction(
                        'editor.action.formatDocument'
                      );

                      if (action) {
                        await action.run();
                      }

                      // Call the onSave callback
                      onSave && onSave();
                    }
                  );

                  editorRef.current = editor;
                }}
                options={{
                  automaticLayout: true,
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

const ToggleOverride = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <div className={style['model-script__toggle-override']}>
      <span>{t('common.override')}</span>
      <ToggleSwitch
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
};
