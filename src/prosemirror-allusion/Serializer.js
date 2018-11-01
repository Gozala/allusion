// @flow strict

import Serializer from "../prosemirror-marked/Serializer.js"
import schema from "./Schema.js"
import header from "./Parser/header.js"

export default Serializer.fromSchema(schema)
