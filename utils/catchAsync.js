module.exports = (fn) => {
  return (req, res, next) => {
    // If the async function returns a promise that rejects, pass the error to global error handler
    fn(req, res, next).catch(next);
  };
};
