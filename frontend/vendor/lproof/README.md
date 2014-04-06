# Proof of Liabilities

[![Build Status](https://travis-ci.org/olalonde/proof-of-liabilities.png)](https://travis-ci.org/olalonde/proof-of-liabilities)

*Proof of Liabilities* specification and Javascript implementation.

Proof of Liabilities (PoL) is a scheme designed to let companies that accept
monetary deposits from consumers (e.g. Bitcoin exchanges, gambling websites,
online Bitcoin wallets, etc.) prove their total amount of deposits (their liabilities)
without compromising the privacy of individual users.

The Proof of Liabilities scheme can be used as part of the broader 
[Proof of Solvency][pos] scheme.

[pos]: https://github.com/olalonde/proof-of-solvency

[Proof of Liabilities online tools](http://olalonde.github.io/proof-of-liabilities)

**Table of Contents**

- [Install](#install)
- [Usage](#usage)
- [Library usage](#library-usage)
- [Implementations](#implementations)
- [Specification](#specification)
  - [Definitions](#definitions)
  - [Serialized data formats (work in progress / draft)](#serialized-data-formats-work-in-progress--draft)
  - [Publishing protocol](#publishing-protocol)
- [References](#references)

Beer fund: **1ECyyu39RtDNAuk3HRCRWwD4syBF2ZGzdx**


## Install

```
npm install -g lproof
```

## Usage

Simple usage:

```
# Generate a partial tree for all users in accounts.json.
# Partial trees will be saved to partial_trees/ directory.
# complete_tree.json and root.json will be saved to current directory.
# For a sample accounts file, refer to test/accounts.json.

$ lproof generate -f accounts.json

# Verify a partial tree 

$ lproof verify --root root.json -f partial_trees/satoshi.json

# or (where hash is the root hash and sum is the root sum)

$ lproof verify --hash "1ded5478d0116b30aca091f8d5ddd2340d9391dca47a41d9271e61ede51c0f6b" --sum 37618 -f mark.json
```

Advanced usage: 

```
# Create complete proof tree from an accounts file (see
# test/account.json for format)

$ lproof completetree -f test/accounts.json --human
$ lproof completetree -f test/accounts.json > complete.out.json

# Extract partial tree for user mark.

$ lproof partialtree mark -f complete.out.json --human
$ lproof partialtree mark -f complete.out.json > mark.out.json

# Display root node hash and sum

$ lproof root -f complete.out.json --human

# Verify partial tree

$  verify --hash "1ded5478d0116b30aca091f8d5ddd2340d9391dca47a41d9271e61ede51c0f6b" --sum 37618 -f mark.out.json
```

## Library usage

See `cli.js`. 

Browser build: `browserify index.js --standalone lproof > build/lproof.js`.

## Implementations

- Javascript: [olalonde/proof-of-liabilities](#install)
- Clojure: [zw/PoLtree](https://github.com/zw/PoLtree/)
- Ruby: [peatio/liability-proof](https://github.com/peatio/liability-proof)
- Python: [ConceptPending/proveit](https://github.com/ConceptPending/proveit)

Non interoperable implementations:

- C++: [bifubao/proof_of_reserves](https://github.com/bifubao/proof_of_reserves),
[payward/krakendb](https://github.com/payward/krakendb)

## Specification

### Definitions

#### Complete proof tree
  
The complete proof tree is a binary tree where the leaf nodes
represent all the user accounts and the internal nodes generated using the
NodeCombiner function described below.

The complete tree should be kept private by the operator in order to
protect the privacy of its users. Only the root node should be published
publicly and each individual user should have private access to their
own [partial proof tree](#partial-proof-tree).

Ideally the tree layout [should be random][random].

 [random]: /olalonde/proof-of-liabilities/issues/4

#### Leaf node

Leaf nodes represent user accounts. They possess the following values:

  - `user`: A unique identifier for the user.  The user must ensure the
    uniqueness of this value so using their username or e-mail is recommended
    (it is never revealed by this scheme).
  - `nonce`: A random secret assigned by the operator to prevent neighbours
    from accidentally or deliberately discovering the value of `user` or `sum`
    (balance).
  - `sum`: The user's balance (called `sum` for consistency with internal
    nodes).
  - `hash`: SHA256(`user` + '|' + `sum` + '|' + `nonce`)

#### Internal node

Internal nodes are generated using the NodeCombiner function described
below.

The node's sum is the result of adding of its children's sums.

The node's hash is its sum concatenated with its children's hashes, fed to
SHA256.

```
function NodeCombiner (left_child, right_child) {
  var n = {};
  n.sum = left_child.sum + right_child.sum;
  n.hash = sha256(string(n.sum) + '|' + left_child.hash + '|' + right_child.hash);
  return n;
}
```

#### Root node

The root node of the, tree like all internal nodes, possesses a hash and a sum.
This data must be published publicly so that all users can ensure they're
verifying against the same proof tree.

#### Partial proof tree

A partial proof tree contains only the nodes from the complete tree which a
given user needs in order to verify he was included in the tree.

It can be generated by starting with the user's leaf node and including every
parent node up the tree, up to and including the root node (the *root path*).
Then the sibling of each node on the path must be added to the tree.

- All internal nodes should be completely stripped of their data to encourage
  verifiers to compute it themselves.

- All leaf nodes except for the leaf representing the given user should be
  stripped of their `user` and `nonce` properties to ensure privacy.

- The leaf representing the given user should be stripped of its `hash`
  property to encourage verifiers to compute it themselves.

Partial trees should be disclosed privately to each individual user so they can
verify the proof, learning an absolute minimum about their neigbours.

### Serialized data formats (work in progress / draft)

This section is intended to standardize the way root nodes and trees are
generated and represented in order to make implementations compatible.

#### Hashing leaf nodes

To be accepted by conforming verifier tools, leaf (account) node hashes must be
computed using:

    SHA256(user + '|' + string(sum) + '|' + nonce)

where `user`, `sum` and `nonce` have the same meanings [as above](#leaf-node),
but specifically:

 * strings are trimmed of any whitespace then joined using the pipe
   character (ASCII 0x7C) as a separator; no ASCII NULs are included in the
   SHA256 input
 * `string(sum)` is a string representation of the balance for the
   corresponding account, matching the regular expression
   `^(0|[1-9][0-9]*)(\.[0-9]+)?$` (or informally, the [JSON 'number'][jsonum]
   format but no negative numbers and no 'e' notation).
   This representation **must** be in the shortest possible form allowed by the
   regular expression, achieved by [stripping trailing zero digits][strip] from
   the fractional part<sup>[[1]](#stz-bug)</sup>.  The representation **should
   not** use more decimal places than required to represent the currency's
   [smallest subunit][subunit]; if the operator's system uses more decimal
   places, the value **should** be [rounded towards +∞][ceiling] to the next
   subunit before any use (addition/hashing/serialisation) in this scheme.
   **Any conversion performed to produce or consume it [should be done very
   carefully][pmh]**.
   Examples:
    * given $0, use `0`, not `0.0` or `0.000`
    * given $1.23 use `1.23`, not `1.230` or `1.23000000`
    * given $1.20 use `1.2`, not `1.20` or `1.20000`
    * given $20.00 use `20`, not `20.00` or `20.000000`
    * *prefer* to round $1234.5678 to $1234.57 before any use in this scheme
 * `nonce` is encoded as a hexadecimal string.

 [jsonum]: http://www.json.org/number
 [pmh]: https://en.bitcoin.it/wiki/Proper_Money_Handling_%28JSON-RPC%29
 [strip]: http://docs.oracle.com/javase/1.5.0/docs/api/java/math/BigDecimal.html#stripTrailingZeros%28%29
 [subunit]: https://en.wikipedia.org/wiki/Denomination_%28currency%29#Subunit_and_super_unit
 [ceiling]: http://docs.oracle.com/javase/6/docs/api/java/math/RoundingMode.html#CEILING

Example: if user `frank@example.com` had a balance of `3.1415` bitcoins and had
been been assigned nonce `e3b0c44298fc1c149afbf4c8996fb924` by the operator,
the hash would take the following string as input:

    frank@example.com|3.1415|e3b0c44298fc1c149afbf4c8996fb924

producing (hexadecimal-encoded) hash:

    7856aa35ddcf71ab84d18c16d5ac1b90b19e6d54e932d972595235d343c17461

#### Hashing internal nodes

Internal (non-account) node hashes must be computed using:

    SHA256(string(sum) + '|' + left_child.hash + '|' + right_child.hash)

where `sum`, `left_child.hash` and `right_child.hash` have the same meanings
[as above](#internal-node), but specifically:

 * strings are trimmed of any whitespace then joined using the pipe
   character (ASCII 0x7C) as a separator; no ASCII NULs are included in the
   SHA256 input
 * `string(sum)` is as above for leaf nodes, except represents the liabilities
   sum for the subtree.
 * `left_child.hash`(/`right_child.hash`) is the 64-digit hexadecimal string
   encoding (with lowercase letters) of the left(/right) child's hash

Example: if an internal node had a subtree liability sum of `71.31` bitcoins
and child nodes with (hexadecimal-encoded) hashes of
`000d5478d0116b30aca091f8d5ddd2340d9391dca47a41d9271e61ede51c0f6b` (left) and
`20aa3f466728a58182a9b7733fcb70044ab489a27554d9fb7ed520936759bf96` (right), the
hash would take the following string as input:

    71.31|000d5478d0116b30aca091f8d5ddd2340d9391dca47a41d9271e61ede51c0f6b|20aa3f466728a58182a9b7733fcb70044ab489a27554d9fb7ed520936759bf96

producing (hexadecimal-encoded) hash:

    81dbc2416e7ead6a4ac1db605c56e293119a7ed65f3c80fdf1abbceeef22ac15

#### Root node

A JSON object:

```javascript
{
  "root": {
    "sum": <JSON string, as described above>,
    "hash": <JSON string, as described above>
  },
  "currency": <JSON string>,
  "timestamp": <JSON number>
}
```

`hash` and `sum` are calculated as [described above](#hashing-internal-nodes);
both are JSON strings.  `hash` is encoded as a 64-digit hexadecimal string
with lowercase letters.  The contents of string `sum` **should** be identical
to the [representation used in hashing](#hashing-internal-nodes), but
equivalents (which add a fractional part with zeros in all decimal places, or
which add trailing zeros to an existing fractional part) that still match the
regex are allowed.

`currency` is the 3 letter [ISO 4217][currency code] currency code (e.g.
`USD` for United States dollar). If there is no ISO 4217 currency code for 
the currency, use the code that Bloomberg uses (e.g. `XBT` for Bitcoin) 
and otherwise, spell out the full currency name in lowercase (e.g. `namecoin`). 

`timestamp` is a [UNIX timestamp][unix timestamp], which is the number of
*milliseconds* between Epoch and the time at which the user balances were
retrieved.

[currency code]: http://en.wikipedia.org/wiki/Currency_codes
[unix timestamp]: http://en.wikipedia.org/wiki/Unix_timestamp

Example:

```javascript
{
  "root": {
    "sum": "37618",
    "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "currency": "XBT",
  "timestamp": 1395718369805
}
```

#### Partial trees

Partial trees are represented as a JSON object graph made up of nodes.  Each
node has the following format:

```javascript
{
  "left": <node>,
  "right": <node>,
  "data": <node_data>
}
```

`<node_data>` is a JSON object containing some subset of the following
name/value pairs:

 * `sum` (JSON string): as [described above](#hashing-internal-nodes).  The
   contents **should** be identical to the [representation used in
   hashing](#hashing-internal-nodes), but equivalents (which add a fractional
   part with zeros in all decimal places, or which add trailing zeros to an
   existing fractional part) that still match the regex are allowed.
     * Immediate children of nodes on the root path **must** have this key set.
     * Other nodes **should not** have this key set.
 * `hash` (JSON string): generated as [described
   above](#hashing-internal-nodes), encoded as a 64-digit hexadecimal string
   with lowercase letters.
     * Immediate children of nodes on the root path **must** have this key set.
     * Other nodes **should not** have this key set.
 * `user` (JSON string): The unique string chosen by the user.
     * The node belonging to the user this partial tree was generated for **must**
       have this key set.
     * All other nodes **must not** have this key set.
 * `nonce` (JSON string): The nonce assigned to the user, encoded as a
   hexadecimal string with lowercase letters.
     * **Should** be at least 128 bits of cryptographically strong entropy.
     * The node belonging to the user this partial tree was generated for **must**
       have this key set.
     * All other nodes **must not** have this key set.

If redundant keys are omitted as suggested, the `"data": <node_data>` key/value
pair will have an empty object (`{}`) for `<node_data>`, in which case the
key/value pair **should** be omitted.

Example leaf node's `<node_data>`:

```javascript
{
  "user": "frank@example.com",
  "sum": "3.1415",
  "nonce": "e3b0c44298fc1c149afbf4c8996fb924",
}
```

Example `<node_data>` for an immediate child of a node on the root path:

```javascript
{
  "sum": "71.31",
  "hash": "81dbc2416e7ead6a4ac1db605c56e293119a7ed65f3c80fdf1abbceeef22ac15"
}
```

#### Account lists

For the purposes of sharing test input and to help pin down inconsistencies
between implementations, it would help if your implementation accepted an
account list in the following form.  This need not be its usual or only means
of accepting account lists.

An account list is a JSON array of JSON objects:

```javascript
[
  {
    "user": <JSON string, as described above>,
    "balance": <JSON string as described above>,
    "nonce": <JSON string as described above>
  }
  {
    "user": <JSON string, as described above>,
    "balance": <JSON string as described above>,
    "nonce": <JSON string as described above>
  }
  ...
]
```

Trees should ideally be given [random layouts][random] normally but when
accepting this form for testing you should produce the tree with a
deterministic algorithm:

 * pad out the accounts list size to the next power of two, using accounts
   with user "dummy", balance "0.00000000" and nonce "0"
 * produce a [perfect binary tree][perfect]
 * ensure that a traversal of the tree would visit the leaf nodes in the same
   order they appeared

This ensures that the root hash for the tree is deterministic and predictable
which makes tests shareable.

<a name="stz-bug" class="anchor" href="#stz-bug">[1]:</a>
Note that there's a [bug in `BigDecimal.stripTrailingZeros`][6480539] in
JDK <8 where `0.000` doesn't change.

 [perfect]: https://en.wikipedia.org/wiki/Binary_tree#Types_of_binary_trees
 [6480539]: https://bugs.openjdk.java.net/browse/JDK-6480539

### Publishing protocol

See [olalonde/proof-of-solvency](https://github.com/olalonde/proof-of-solvency#liabilities-proof).

### Acknowledgements

- [Gregory Maxwell](https://github.com/gmaxwell) for coming up with the original idea 
- [@zw](https://github.com/zw) for co-authoring the specification
- All [implementers](#implementations)

## References

- https://iwilcox.me.uk/2014/proving-bitcoin-reserves
- [Reddit announcement](http://www.reddit.com/r/Bitcoin/comments/1yzil4/i_implemented_gmaxwells/)
- [HN post](https://news.ycombinator.com/item?id=7277865)
- [Example of how a shared wallet website could use the CLI](http://www.reddit.com/r/Bitcoin/comments/1yzil4/i_implemented_gmaxwells/cfp50ib)
