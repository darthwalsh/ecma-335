## II.15.4.2 Predefined attributes on methods

 | _MethAttr_ ::= | Description | Clause
 | ---- | ---- | ----
 | `abstract` | The method is abstract (shall also be virtual). | §[II.15.4.2.4](ii.15.4.2.4-method-attributes.md)
 | \| `assembly` | Assembly accessibility | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `compilercontrolled` | Compiler-controlled accessibility. | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `famandassem` | Family and Assembly accessibility | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `family` | Family accessibility | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `famorassem` | Family or Assembly accessibility | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `final` | This virtual method cannot be overridden by derived classes. | §[II.15.4.2.2](ii.15.4.2.2-method-contract-attributes.md)
 | \| `hidebysig` | Hide by signature. Ignored by the runtime. | §[II.15.4.2.2](ii.15.4.2.2-method-contract-attributes.md)
 | \| `newslot` | Specifies that this method shall get a new slot in the virtual method table. | §[II.15.4.2.3](ii.15.4.2.3-overriding-behavior.md)
 | \| `pinvokeimpl` `'('` _QSTRING_ [ `as` _QSTRING_ ] _PinvAttr_* `')'` | Method is actually implemented in native code on the underlying platform | §[II.15.4.2.5](ii.15.4.2.5-interoperation-attributes.md)
 | \| `private` | Private accessibility | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `public` | Public accessibility. | §[II.15.4.2.1](ii.15.4.2.1-accessibility-information.md)
 | \| `rtspecialname` | The method name needs to be treated in a special way by the runtime. | §[II.15.4.2.6](ii.15.4.2.6-special-handling-attributes.md)
 | \| `specialname` | The method name needs to be treated in a special way by some tool. | §[II.15.4.2.6](ii.15.4.2.6-special-handling-attributes.md)
 | \| `static` | Method is static. | §[II.15.4.2.2](ii.15.4.2.2-method-contract-attributes.md)
 | \| `virtual` | Method is virtual. | §[II.15.4.2.2](ii.15.4.2.2-method-contract-attributes.md)
 | \| `strict` | Check accessibility on override | §[II.15.4.2.2](ii.15.4.2.2-method-contract-attributes.md)

The following combinations of predefined attributes are invalid:

 * **static** combined with any of **final**, **newslot**, or **virtual**

 * **abstract** combined with any of **final** or **pinvokeimpl**

 * **compilercontrolled** combined with any of **final**, **rtspecialname**, **specialname**, or **virtual**
