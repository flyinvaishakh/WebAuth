//Higher Order Function-> A function that takes another function as an argument or that returns a function

//Here, this is a higher-order function because it takes a function as an argument and returns another function
//am passing my route-handler to this

const TryCatch = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  };
};

export default TryCatch;
