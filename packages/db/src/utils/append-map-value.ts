export function appendMapValue<Key, Value>({
  key,
  map,
  value,
}: {
  key: Key;
  map: Map<Key, Value[]>;
  value: Value;
}): void {
  const values = map.get(key);

  if (values) {
    values.push(value);
    return;
  }

  map.set(key, [value]);
}
