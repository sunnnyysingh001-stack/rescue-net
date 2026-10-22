package dev.sunny.rescue;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
class Errors {

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> conflict(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of(
        "message",
        e.getReason() == null ? "Request rejected" : e.getReason()
      )
    );
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
  })
  ResponseEntity<?> invalid(Exception e) {
    return ResponseEntity.badRequest().body(
      Map.of(
        "message",
        "Invalid input. Check required fields and allowed values."
      )
    );
  }
}
