'use client';

import type { ComponentPropsWithoutRef } from 'react';

/** Форма фильтров: выбор в выпадающем списке применяется сразу, без кнопки. */
export function AutoSubmitForm(props: ComponentPropsWithoutRef<'form'>) {
  return (
    <form
      {...props}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === 'SELECT') e.currentTarget.requestSubmit();
      }}
    />
  );
}
