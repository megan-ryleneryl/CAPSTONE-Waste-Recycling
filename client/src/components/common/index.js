// client/src/components/common/index.js
// This file exports all common components for easy importing

export { default as Button } from './Button/Button';
export { default as Input } from './Input/Input';
export { default as Card } from './Card/Card';

// You can also create grouped exports
export const FormComponents = {
  Button: require('./Button/Button').default,
  Input: require('./Input/Input').default,
};

export const LayoutComponents = {
  Card: require('./Card/Card').default,
};

// This allows you to import like:
// import { Button, Input, Card } from '../components/common';
// OR
// import { FormComponents } from '../components/common';
// const { Button, Input } = FormComponents;