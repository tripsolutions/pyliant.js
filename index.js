exports.pyliant_decode = function(o) {
    var id_map = {}
    var incomplete_refs = {}
    function object_xform(o) {
        if ('_ref' in o) {
            if (o._ref in id_map)
                return id_map[o._ref]
            // add to incomplete refs and id map
            incomplete_refs[o._ref] = o
            id_map[o._ref] = o
            delete o._ref
            // will be filled in later
            return o
        }

        if ('_id' in o) {
            if (o._id in incomplete_refs) {
                var ref = incomplete_refs[o._id]
                // is being filled in, no longer incomplete
                delete incomplete_refs[o._id]
                delete o._id
                for (var key in o) {
                    if (o[key] instanceof Array)
                        ref[key] = array_xform(o[key])
                    else if (o[key] instanceof Object)
                        ref[key] = object_xform(o[key])
                    else
                        ref[key] = o[key]
                }
                return ref
            }
            id_map[o._id] = o
            delete o._id
        }

        for (var key in o) {
            if (o[key] instanceof Array)
                o[key] = array_xform(o[key])
            else if (o[key] instanceof Object)
                o[key] = object_xform(o[key])
        }
        return o
    }

    function array_xform(arr) {
        var ret = []
        for (var i in arr) {
            if (arr[i] instanceof Array)
                ret.push(array_xform(arr[i]))
            else if (arr[i] instanceof Object)
                ret.push(object_xform(arr[i]))
            else
                ret.push(arr[i])
        }
        return ret
    }

    return object_xform(o)
}

exports.pyliant_encode = function(o) {
    var id_set = new WeakSet()
    var id_map = new WeakMap()
    var current = 1
    function object_xform(o) {
        if (id_map.has(o)) {
            var ref = id_map.get(o)
            if (!('_id' in ref))
                ref._id = current++
            return { _ref: ref._id }
        }
        var ref = {}
        id_map.set(o, ref)
        for (var key in o) {
            if (o[key] instanceof Array)
                ref[key] = array_xform(o[key])
            else if (o[key] instanceof Object)
                ref[key] = object_xform(o[key])
            else
                ref[key] = o[key]
        }
        return ref
    }

    // arrays should never be referenced multiple times
    // this is reserved for object only
    function array_xform(arr) {
        var ret = []
        for (var i in arr) {
            if (arr[i] instanceof Array)
                ret.push(array_xform(arr[i]))
            else if (arr[i] instanceof Object)
                ret.push(object_xform(arr[i]))
            else
                ret.push(arr[i])
        }
        return ret
    }

    return object_xform(o)
}

exports.formatQuery = function(query) {
    let formattedQuery = ''
    if (query) {
      if (typeof query === 'string') return query
      if (typeof query === 'object') {
        Object.keys(query).forEach((key) => {
          let symbol = ''
          switch (key) {
            case 'include': symbol = '+'; break
            case 'exclude': symbol = '-'; break
            case 'populate': symbol = '*'; break
          }
          if (typeof query[key] === 'string') {
            formattedQuery += `${symbol}${query[key]},`
          } else if (Array.isArray(query[key])) {
            query[key].forEach((el) => {
              const aux = {}; aux[key] = el
              formattedQuery += `${formatQuery(aux)},`
            })
          } else if (typeof query[key] === 'object') {
            formattedQuery += `${symbol}${query[key].name}(${formatQuery(query[key].query)}),`
          }
        })
      }
    }
    return formattedQuery.substr(0, formattedQuery.length - 1)
  }