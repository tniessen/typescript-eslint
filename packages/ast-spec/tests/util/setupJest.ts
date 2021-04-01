import { addSerializer } from 'jest-specific-snapshot';

import * as Node from './serializers/Node';

const serializers = [
  //
  Node.serializer,
];

for (const serializer of serializers) {
  // the jest types are wrong here
  expect.addSnapshotSerializer(serializer);
  addSerializer(serializer);
}
