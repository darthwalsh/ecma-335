## III.3.37 jmp &ndash; jump to method

 | Format | Assembly Format | Description
 | ---- | ---- | ----
 | 27 _\<T\>_ | `jmp` _method_ | Exit current method and jump to the specified method.

#### Stack Transition:

&hellip; &rarr; &hellip;

#### Description:

Transfer control to the method specified by _method_, which is a metadata token (either a `methodref` or `methoddef` (See [Partition II](ii.22-metadata-logical-format-tables.md)). The current arguments are transferred to the destination method.

The evaluation stack shall be empty when this instruction is executed.

The calling convention, number and type of arguments at the destination address shall match that of the current method.

The `jmp` instruction cannot be used to transferred control out of a **try**, **filter**, **catch**, **fault** or **finally** block; or out of a synchronized region. If this is done, results are undefined. See [Partition I](i.12.4.2-exception-handling.md).

#### Exceptions:

None.

#### Correctness:

Correct CIL code obeys the control flow restrictions specified above.

#### Verifiability:

The `jmp` instruction is never verifiable.
