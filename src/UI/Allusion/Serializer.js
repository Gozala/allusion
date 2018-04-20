// @flow strict

import Serializer from "../../prosemirror-markedown/Serializer"
import schema from "./Schema"
import header from "./Parser/header"

export default Serializer.fromSchema(schema)
