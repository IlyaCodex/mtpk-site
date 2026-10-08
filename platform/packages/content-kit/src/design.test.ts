import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buttonDesignAttrs, buttonDesignHtml } from './design.ts';

test('ничего не задано — пусто, кнопки как в дизайне', () => {
  assert.deepEqual(buttonDesignHtml(undefined), { attrs: {}, vars: {} });
  assert.deepEqual(buttonDesignHtml({}), { attrs: {}, vars: {} });
  assert.equal(buttonDesignAttrs(undefined), '');
});

test('скругление: px, 30 и больше — «таблетка»', () => {
  assert.deepEqual(buttonDesignHtml({ buttonRadius: 8 }), { attrs: { 'data-btn-radius': '' }, vars: { '--design-radius': '8px' } });
  assert.equal(buttonDesignHtml({ buttonRadius: 30 }).vars['--design-radius'], '999px');
  assert.equal(buttonDesignHtml({ buttonRadius: 0 }).vars['--design-radius'], '0px');
});

test('цвет кнопок: наведение темнее, текст по умолчанию белый; контур — светлее в тёмной теме', () => {
  const { attrs, vars } = buttonDesignHtml({ buttonColor: '#1f5e78', buttonOutlineColor: '#1f5e78' });
  assert.deepEqual(Object.keys(attrs).sort(), ['data-btn-color', 'data-btn-outline']);
  assert.equal(vars['--design-primary'], '#1f5e78');
  assert.equal(vars['--design-primary-text'], '#ffffff');
  assert.equal(vars['--design-primary-hover'], '#1b536a');
  assert.match(vars['--design-outline-dark'], /^#[0-9a-f]{6}$/);
  assert.notEqual(vars['--design-outline-dark'], '#1f5e78');
  // только цвет текста — фон остаётся фирменным зелёным
  assert.equal(buttonDesignHtml({ buttonTextColor: '#18181b' }).vars['--design-primary'], '#4fab3a');
  assert.equal(buttonDesignAttrs({ buttonRadius: 4 }), ' data-btn-radius="" style="--design-radius:4px"');
});
