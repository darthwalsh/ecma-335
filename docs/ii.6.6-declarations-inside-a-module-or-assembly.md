## II.6.6 Declarations inside a module or assembly

Declarations inside a module or assembly are specified by the following grammar. More information on each option can be found in the corresponding clause or subclause.

 | _Decl_ ::= | Clause
 | ---- | ----
 | \| `.class` _ClassHeader_ `'{'` _ClassMember_* `'}'` | §[II.10](#todo-missing-hyperlink)
 | \| `.custom` _CustomDecl_ | §[II.21](#todo-missing-hyperlink)
 | \| `.data` _DataDecl_ | §[II.16.3.1](#todo-missing-hyperlink)
 | \| `.field` _FieldDecl_ | §[II.16](#todo-missing-hyperlink)
 | \| `.method` _MethodHeader_ `'{'` _MethodBodyItem_* `'}'` | §[II.15](#todo-missing-hyperlink)
 | \| _ExternSourceDecl_ | §[II.5.7](#todo-missing-hyperlink)
 | \| _SecurityDecl_ | §[II.20](#todo-missing-hyperlink) 
 | \| &hellip;